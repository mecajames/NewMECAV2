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

async function main() {
  console.log('Assets path:', assetsPath);
  console.log('Templates path:', templatesPath);
  console.log('Fonts path:', fontsPath);

  // Register Impact font
  const fontPath = path.join(fontsPath, 'impact.ttf');
  if (fs.existsSync(fontPath)) {
    registerFont(fontPath, { family: 'Impact' });
    console.log('Impact font registered');
  } else {
    console.error('Impact font not found at:', fontPath);
    process.exit(1);
  }

  // Get all templates
  const { data: templates, error: templatesError } = await supabase
    .from('achievement_templates')
    .select('*');

  if (templatesError) {
    console.error('Error fetching templates:', templatesError);
    process.exit(1);
  }

  console.log('Templates:', templates?.length);

  // Get ALL recipients (regenerate all images)
  const { data: recipients, error: recipientsError } = await supabase
    .from('achievement_recipients')
    .select(`
      id,
      achieved_value,
      achievement_id,
      achievement_definitions (
        id,
        name,
        template_key,
        threshold_value
      )
    `);

  if (recipientsError) {
    console.error('Error fetching recipients:', recipientsError);
    process.exit(1);
  }

  console.log('Recipients to process:', recipients?.length);

  if (!recipients || recipients.length === 0) {
    console.log('No recipients found');
    process.exit(0);
  }

  let generated = 0;
  let failed = 0;

  for (const recipient of recipients) {
    const definition = recipient.achievement_definitions as any;
    if (!definition) {
      console.error(`No definition for recipient ${recipient.id}`);
      failed++;
      continue;
    }

    const template = templates?.find(t => t.key === definition.template_key);
    if (!template) {
      console.error(`No template found for key: ${definition.template_key}`);
      failed++;
      continue;
    }

    const imagePath = path.join(templatesPath, template.base_image_path);
    if (!fs.existsSync(imagePath)) {
      console.error(`Template image not found: ${imagePath}`);
      failed++;
      continue;
    }

    try {
      // Use threshold value with "+" suffix (like "130+", "150+")
      const thresholdValue = Math.floor(Number(definition.threshold_value));
      const displayValue = `${thresholdValue}+`;

      console.log(`Generating image for ${definition.name} (displaying: ${displayValue})`);

      // Load base image
      const baseImage = await loadImage(imagePath);

      // Create canvas
      const canvas = createCanvas(baseImage.width, baseImage.height);
      const ctx = canvas.getContext('2d');

      // Draw base image
      ctx.drawImage(baseImage, 0, 0);

      // Set text properties - use alphabetic baseline like PHP imagettftext
      ctx.font = `${template.font_size}px Impact`;
      ctx.fillStyle = template.text_color;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic'; // PHP uses baseline positioning

      // Draw text at the position specified in template
      ctx.fillText(displayValue, template.text_x, template.text_y);

      // Get buffer
      const buffer = canvas.toBuffer('image/png');

      // Upload to Supabase storage
      const filename = `${recipient.id}-${Date.now()}.png`;
      const storagePath = `achievements/${filename}`;

      const { error: uploadError } = await supabase.storage
        .from('achievement-images')
        .upload(storagePath, buffer, {
          contentType: 'image/png',
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        console.error(`Upload error for ${recipient.id}:`, uploadError);
        failed++;
        continue;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('achievement-images')
        .getPublicUrl(storagePath);

      // Update recipient with image URL
      const { error: updateError } = await supabase
        .from('achievement_recipients')
        .update({
          image_url: urlData.publicUrl,
          image_generated_at: new Date().toISOString(),
        })
        .eq('id', recipient.id);

      if (updateError) {
        console.error(`Update error for ${recipient.id}:`, updateError);
        failed++;
        continue;
      }

      console.log(`Generated: ${displayValue} -> ${urlData.publicUrl}`);
      generated++;
    } catch (error) {
      console.error(`Error generating image for ${recipient.id}:`, error);
      failed++;
    }
  }

  console.log(`\nComplete: ${generated} generated, ${failed} failed`);
}

main().catch(console.error);
