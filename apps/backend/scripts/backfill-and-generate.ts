import { createCanvas, loadImage, registerFont } from 'canvas';
import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const assetsPath = path.join(__dirname, '..', 'assets');
const templatesPath = path.join(assetsPath, 'achievement-templates');
const fontsPath = path.join(assetsPath, 'fonts');

// Competition type matching logic - uses class_filter from definition (EXACT match)
function matchesCompetitionType(
  competitionClass: string,
  format: string,
  definition: any
): boolean {
  // If class_filter is defined, use EXACT matching (case-insensitive)
  if (definition.class_filter && definition.class_filter.length > 0) {
    const resultClass = (competitionClass || '').toLowerCase().trim();
    const classMatches = definition.class_filter.some((allowedClass: string) =>
      resultClass === allowedClass.toLowerCase().trim()
    );
    return classMatches;
  }

  // Fallback to pattern matching (for definitions without class_filter)
  const classLower = (competitionClass || '').toLowerCase();
  const formatLower = (format || '').toLowerCase();
  const typeLower = (definition.competition_type || '').toLowerCase();

  // Radical X
  if (typeLower.includes('radical x')) {
    return classLower.includes('radical') || classLower.startsWith('x ');
  }

  // Park and Pound
  if (typeLower.includes('park and pound')) {
    return classLower.includes('park') && classLower.includes('pound');
  }

  // Dueling Demos
  if (typeLower.includes('dueling demos')) {
    return classLower.includes('duel') || classLower.includes('demo');
  }

  // Certified Sound (SQL format)
  if (typeLower.includes('certified sound')) {
    return classLower.includes('install') || formatLower === 'sql';
  }

  // Certified at the Headrest (CATH) - DEFAULT for SPL
  if (typeLower.includes('certified at the headrest')) {
    const isRadical = classLower.includes('radical') || classLower.startsWith('x ');
    const isParkPound = classLower.includes('park') && classLower.includes('pound');
    const isDueling = classLower.includes('duel') || classLower.includes('demo');
    const isSQL = classLower.includes('install') || formatLower === 'sql';
    const isKids = classLower.includes('kids');
    return !isRadical && !isParkPound && !isDueling && !isSQL && !isKids;
  }

  return false;
}

// Round DOWN to the nearest threshold (e.g., 153.4 -> 150 for 5-step thresholds)
function findHighestQualifyingThreshold(score: number, thresholds: number[]): number | null {
  // Sort thresholds descending
  const sorted = [...thresholds].sort((a, b) => b - a);

  for (const threshold of sorted) {
    if (score >= threshold) {
      return threshold;
    }
  }
  return null;
}

async function main() {
  console.log('=== BACKFILL AND GENERATE ACHIEVEMENT IMAGES ===\n');
  console.log('Logic: ONE achievement per competition type (highest earned, rounded DOWN)\n');

  // Register Impact font
  const fontPath = path.join(fontsPath, 'impact.ttf');
  if (fs.existsSync(fontPath)) {
    registerFont(fontPath, { family: 'Impact' });
    console.log('Impact font registered');
  } else {
    console.error('Impact font not found');
    process.exit(1);
  }

  // Get all templates
  const { data: templates } = await supabase.from('achievement_templates').select('*');
  console.log(`Loaded ${templates?.length} templates`);

  // Get all achievement definitions ordered by group and threshold DESC
  const { data: definitions } = await supabase
    .from('achievement_definitions')
    .select('*')
    .eq('is_active', true)
    .order('group_name', { ascending: true })
    .order('threshold_value', { ascending: false });
  console.log(`Loaded ${definitions?.length} definitions`);

  // Get all competition results with competitor, ordered by score DESC
  const { data: results } = await supabase
    .from('competition_results')
    .select('id, competitor_id, meca_id, competition_class, format, score, event_id, season_id')
    .not('competitor_id', 'is', null)
    .order('score', { ascending: false });
  console.log(`Found ${results?.length} competition results with competitors\n`);

  if (!results || !definitions || !templates) {
    console.error('Missing data');
    process.exit(1);
  }

  // Group definitions by group_name
  const defsByGroup = new Map<string, any[]>();
  for (const def of definitions) {
    const group = def.group_name || def.competition_type;
    if (!defsByGroup.has(group)) {
      defsByGroup.set(group, []);
    }
    defsByGroup.get(group)!.push(def);
  }

  console.log('Achievement groups:', Array.from(defsByGroup.keys()).join(', '));

  // Track best score per profile per group
  // Map<profileId, Map<groupName, { score, resultId, class, format }>>
  const profileBestByGroup = new Map<string, Map<string, { score: number; result: any }>>();

  // Find best score per profile per group
  for (const result of results) {
    if (!result.competitor_id || !result.score) continue;

    const profileId = result.competitor_id;
    const score = Number(result.score);

    if (!profileBestByGroup.has(profileId)) {
      profileBestByGroup.set(profileId, new Map());
    }
    const profileGroups = profileBestByGroup.get(profileId)!;

    // Check which group this result belongs to
    for (const [groupName, groupDefs] of defsByGroup) {
      // Check if this result matches any definition in this group
      const matchingDef = groupDefs.find(def =>
        matchesCompetitionType(result.competition_class, result.format, def)
      );

      if (matchingDef) {
        const existing = profileGroups.get(groupName);
        if (!existing || score > existing.score) {
          profileGroups.set(groupName, { score, result });
        }
        break; // A result belongs to only one group
      }
    }
  }

  let awarded = 0;
  let imagesGenerated = 0;

  // Now award ONE achievement per profile per group (the highest qualifying)
  for (const [profileId, groupScores] of profileBestByGroup) {
    for (const [groupName, { score, result }] of groupScores) {
      const groupDefs = defsByGroup.get(groupName);
      if (!groupDefs) continue;

      // Get all thresholds for this group
      const thresholds = groupDefs.map(d => Number(d.threshold_value));

      // Find the highest threshold this score qualifies for (rounded DOWN)
      const qualifyingThreshold = findHighestQualifyingThreshold(score, thresholds);
      if (!qualifyingThreshold) continue;

      // Find the definition for this threshold
      const def = groupDefs.find(d => Number(d.threshold_value) === qualifyingThreshold);
      if (!def) continue;

      console.log(`Awarding "${def.name}" to profile ${profileId}`);
      console.log(`  Score: ${score}, Rounded to: ${qualifyingThreshold}+, Class: ${result.competition_class}`);

      const template = templates.find(t => t.key === def.template_key);
      if (!template) {
        console.error(`  No template for key: ${def.template_key}`);
        continue;
      }

      // Generate image
      const imagePath = path.join(templatesPath, template.base_image_path);
      if (!fs.existsSync(imagePath)) {
        console.error(`  Template image not found: ${imagePath}`);
        continue;
      }

      const displayValue = `${qualifyingThreshold}`;

      const baseImage = await loadImage(imagePath);
      const canvas = createCanvas(baseImage.width, baseImage.height);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(baseImage, 0, 0);
      ctx.font = `${template.font_size}px Impact`;
      ctx.fillStyle = template.text_color;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(displayValue, template.text_x, template.text_y);

      const buffer = canvas.toBuffer('image/png');
      const recipientId = crypto.randomUUID();
      const filename = `${recipientId}-${Date.now()}.png`;
      const storagePath = `achievements/${filename}`;

      // Upload image
      const { error: uploadError } = await supabase.storage
        .from('achievement-images')
        .upload(storagePath, buffer, {
          contentType: 'image/png',
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        console.error(`  Upload error: ${uploadError.message}`);
        continue;
      }

      const { data: urlData } = supabase.storage
        .from('achievement-images')
        .getPublicUrl(storagePath);

      // Insert recipient record
      const { error: insertError } = await supabase
        .from('achievement_recipients')
        .insert({
          id: recipientId,
          achievement_id: def.id,
          profile_id: profileId,
          meca_id: result.meca_id,
          achieved_value: score,
          achieved_at: new Date().toISOString(),
          competition_result_id: result.id,
          event_id: result.event_id,
          season_id: result.season_id,
          image_url: urlData.publicUrl,
          image_generated_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error(`  Insert error: ${insertError.message}`);
        continue;
      }

      awarded++;
      imagesGenerated++;
      console.log(`  -> Generated: ${displayValue} (${template.base_image_path})\n`);
    }
  }

  console.log(`\n=== COMPLETE ===`);
  console.log(`Awarded: ${awarded} achievements`);
  console.log(`Images generated: ${imagesGenerated}`);
}

main().catch(console.error);
