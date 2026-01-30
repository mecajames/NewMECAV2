import { Injectable, BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { ParsedResult } from '@newmeca/shared';

@Injectable()
export class ResultsImportService {
  /**
   * Parse Excel file (.xlsx) and extract competition results
   * Expected format:
   * - Sheet1: Member ID, Name (Optional), Team, State, Class, Score, Points, Wattage, Frequency
   * - Internal Values: Division, Class, Abbreviation (optional, for reference)
   */
  parseExcelFile(buffer: Buffer): ParsedResult[] {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });

      // Read the main results sheet (Sheet1)
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        throw new BadRequestException('Excel file has no sheets');
      }

      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet) as any[];

      if (data.length === 0) {
        throw new BadRequestException('Excel file has no data rows');
      }

      // Optional: Read Internal Values sheet for class mapping
      const classMap = new Map<string, { division: string; className: string }>();
      if (workbook.SheetNames.includes('Internal Values')) {
        const internalSheet = workbook.Sheets['Internal Values'];
        const classData = XLSX.utils.sheet_to_json(internalSheet) as any[];

        classData.forEach(row => {
          const abbr = row['Abbreviation'];
          if (abbr) {
            classMap.set(abbr, {
              division: row['Division'] || '',
              className: row['Class'] || '',
            });
          }
        });
      }

      // Parse each row
      const results: ParsedResult[] = data.map((row, index) => {
        const memberID = row['Member ID']?.toString() || '';
        const name = row['Name (Optional)'] || row['Name'] || '';
        const classAbbr = row['Class'] || '';
        const score = parseFloat(row['Score']) || 0;
        const points = row['Points'] !== undefined ? parseInt(row['Points']) : undefined;
        const wattageRaw = row['Wattage'] || row['Power'] || row['Power Wattage'];
        const frequencyRaw = row['Frequency'] || row['Freq'] || row['Hz'];

        if (!classAbbr) {
          throw new BadRequestException(`Row ${index + 2}: Missing class`);
        }

        if (!score && score !== 0) {
          throw new BadRequestException(`Row ${index + 2}: Missing or invalid score`);
        }

        // Parse wattage and frequency
        const wattage = wattageRaw !== undefined && wattageRaw !== '' && wattageRaw !== null
          ? parseInt(wattageRaw.toString())
          : undefined;
        const frequency = frequencyRaw !== undefined && frequencyRaw !== '' && frequencyRaw !== null
          ? parseInt(frequencyRaw.toString())
          : undefined;

        // Look up full class name from Internal Values if available
        const classInfo = classMap.get(classAbbr);

        return {
          memberID: memberID || '999999',
          name,
          class: classInfo?.className || classAbbr,
          classAbbreviation: classAbbr,
          score,
          points,
          format: classInfo?.division,
          wattage: isNaN(wattage as number) ? undefined : wattage,
          frequency: isNaN(frequency as number) ? undefined : frequency,
        };
      });

      return results;
    } catch (error: any) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to parse Excel file: ${error.message}`);
    }
  }

  /**
   * Parse TermLab file (.tlab) and extract competition results
   * Format:
   * "Class Name",format_code,"30","power_limit",score,"id","Competitor Name","something","","","0","meca_id","something","age","placement"
   */
  parseTermLabFile(buffer: Buffer): ParsedResult[] {
    try {
      const content = buffer.toString('utf-8');
      const lines = content.split('\n');

      const results: ParsedResult[] = [];
      let eventName = '';
      let eventDate = '';

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Skip header lines and empty lines
        if (!line || line.startsWith('EVENT ARCHIVE') || line.startsWith('COPYRIGHT') ||
            line.startsWith('***') || line.startsWith('---') ||
            line.startsWith('MECA Event') || line === 'EOF') {
          continue;
        }

        // Extract event name and date (first two quoted strings)
        if (line.startsWith('"') && !line.includes(',')) {
          if (!eventName) {
            eventName = line.replace(/"/g, '');
          } else if (!eventDate) {
            eventDate = line.replace(/"/g, '');
          }
          continue;
        }

        // Parse result lines (CSV format with quoted fields)
        if (line.includes(',') && line.startsWith('"')) {
          try {
            // Parse CSV line with quoted fields
            const fields = this.parseCSVLine(line);

            if (fields.length >= 15) {
              const className = fields[0];
              const formatCode = fields[1];
              const powerLimit = fields[3];
              const score = parseFloat(fields[4]);
              const competitorName = fields[6];
              const wattageRaw = fields[7]?.trim();
              const mecaIdRaw = fields[11]?.trim();
              const frequencyRaw = fields[13]?.trim();
              const placement = parseInt(fields[14]);

              // Debug logging
              console.log(`[TLAB IMPORT] Line ${i + 1}: Name="${competitorName}", Raw MECA ID="${mecaIdRaw}", Wattage="${wattageRaw}", Frequency="${frequencyRaw}", Fields count=${fields.length}`);
              if (competitorName === 'Danny Black') {
                console.log(`[TLAB IMPORT] Danny Black full line:`, line);
                console.log(`[TLAB IMPORT] Danny Black all fields:`, fields);
              }

              // TermLab files are ALWAYS SPL format
              const format = 'SPL';

              // Build vehicle info from power limit if available
              let vehicleInfo = '';
              if (powerLimit && powerLimit !== '0') {
                vehicleInfo = `Power: ${powerLimit}W`;
              }

              // Clean MECA ID - use actual value if present, otherwise 999999
              const mecaId = (mecaIdRaw && mecaIdRaw !== '' && mecaIdRaw !== '0') ? mecaIdRaw : '999999';

              // Parse wattage and frequency
              const wattage = wattageRaw && wattageRaw !== '0' && wattageRaw !== '' ? parseInt(wattageRaw) : undefined;
              const frequency = frequencyRaw && frequencyRaw !== '0' && frequencyRaw !== '' ? parseInt(frequencyRaw) : undefined;

              console.log(`[TLAB IMPORT] Name="${competitorName}", Final MECA ID="${mecaId}", Wattage=${wattage}, Frequency=${frequency}`);

              results.push({
                memberID: mecaId,
                name: competitorName,
                class: className,
                classAbbreviation: className,
                score: isNaN(score) ? 0 : score,
                placement: isNaN(placement) ? undefined : placement,
                vehicleInfo,
                format,
                wattage,
                frequency,
              });
            }
          } catch (parseError: any) {
            // Skip lines that can't be parsed
            console.warn(`Skipping line ${i + 1}: ${parseError.message}`);
          }
        }
      }

      if (results.length === 0) {
        throw new BadRequestException('No valid results found in TermLab file');
      }

      return results;
    } catch (error: any) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to parse TermLab file: ${error.message}`);
    }
  }

  /**
   * Parse a CSV line with quoted fields
   */
  private parseCSVLine(line: string): string[] {
    const fields: string[] = [];
    let currentField = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        fields.push(currentField);
        currentField = '';
      } else {
        currentField += char;
      }
    }

    // Add the last field
    if (currentField || line.endsWith(',')) {
      fields.push(currentField);
    }

    return fields;
  }
}
