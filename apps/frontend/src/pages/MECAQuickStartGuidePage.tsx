import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { rulebooksApi, Rulebook } from '@/rulebooks';
import { seasonsApi, Season } from '@/seasons';

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function CollapsibleSection({ title, children, defaultOpen = false }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-slate-700 rounded-lg overflow-hidden mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 bg-slate-700/50 hover:bg-slate-700 flex items-center justify-between text-left transition-colors"
      >
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>
      {isOpen && (
        <div className="px-6 py-4 bg-slate-800/50">
          {children}
        </div>
      )}
    </div>
  );
}

export default function MECAQuickStartGuidePage() {
  const [currentSeason, setCurrentSeason] = useState<Season | null>(null);
  const [rulebooks, setRulebooks] = useState<Rulebook[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [season, books] = await Promise.all([
          seasonsApi.getCurrent(),
          rulebooksApi.getActiveRulebooks(),
        ]);
        setCurrentSeason(season);
        setRulebooks(books);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getSPLRulebookUrl = () => {
    if (!currentSeason) return null;
    const splBook = rulebooks.find(
      (r) => r.category?.toLowerCase() === 'spl' && String(r.season) === String(currentSeason.year)
    );
    return splBook?.pdfUrl;
  };

  const getSQLRulebookUrl = () => {
    if (!currentSeason) return null;
    const sqlBook = rulebooks.find(
      (r) => r.category?.toLowerCase() === 'sql' && String(r.season) === String(currentSeason.year)
    );
    return sqlBook?.pdfUrl;
  };

  const splRulebookUrl = getSPLRulebookUrl();
  const sqlRulebookUrl = getSQLRulebookUrl();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header with Back Button */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-semibold text-gray-400">Competition Guide</h2>
          <Link
            to="/competition-guides"
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Competition Guides
          </Link>
        </div>

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">MECA Quick Start Guide</h1>
          <p className="text-xl text-gray-300">Part 1 - SPL & SQL Overview</p>
        </div>

        {/* Intro */}
        <div className="bg-slate-800 rounded-xl p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <p className="text-gray-300 mb-4">
                The following is a quick start guide to help you get up to speed quickly in the world of MECA.
                This guide may change from time to time and may not be as up to date as the official rule book
                so we highly recommend you read the rule book and print it for your reference.
              </p>
              {!loading && (
                <div className="flex flex-wrap gap-4">
                  {splRulebookUrl ? (
                    <a
                      href={splRulebookUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors"
                    >
                      <BookOpen className="w-4 h-4 mr-2" />
                      SPL Rule Book {currentSeason?.year}
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </a>
                  ) : (
                    <span className="text-gray-500 text-sm">SPL Rulebook not available for current season</span>
                  )}
                  {sqlRulebookUrl ? (
                    <a
                      href={sqlRulebookUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
                    >
                      <BookOpen className="w-4 h-4 mr-2" />
                      SQL Rule Book {currentSeason?.year}
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </a>
                  ) : (
                    <span className="text-gray-500 text-sm">SQL Rulebook not available for current season</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* MECA SPL Section */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-orange-500 mb-6 flex items-center">
            <span className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">1</span>
            MECA SPL
          </h2>

          <CollapsibleSection title="I. Sensor Placement" defaultOpen={true}>
            <ul className="space-y-3 text-gray-300">
              <li className="flex gap-2">
                <span className="text-orange-500 font-bold">a.</span>
                <span>Competitor cannot touch or move sensor or stand at any time. Competitor may not sit on the same side of the vehicle where the sensor is placed.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-orange-500 font-bold">b.</span>
                <span>Sensor placed on MECA approved stand or holder, provided by Judge, 26" High in the Driver's Seat. The seat and seat back of the seat that the sensor stand is placed in must be in a factory locked position and must allow the stand to sit flat on the seat bottom. The stand may not be leaned forward.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-orange-500 font-bold">c.</span>
                <span>Sensor faces front of vehicle at all times in horizontal position, except for "Park & Pound".</span>
              </li>
              <li className="flex gap-2">
                <span className="text-orange-500 font-bold">d.</span>
                <span>With the seat in a factory latched position, the sensor stand will be placed in the center of the seat with the rear of stand touching the seat-back, or be as close as possible.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-orange-500 font-bold">e.</span>
                <span>With the sensor and stand placed, the seat must be moved to place the sensor a distance of 20" from the windshield as measured on the horizontal plane, except for "Radical X" and "Park & Pound".</span>
              </li>
              <li className="flex gap-2">
                <span className="text-orange-500 font-bold">f.</span>
                <span>If the Competitor's seat is not able to move forward enough for the sensor to reach 20", then with the seat in the forward most latched position, the stand will be moved forward to allow the sensor to reach 20", and may weighted down with sandbags or equivalent. However, the base of the sensor stand must still be completely on the seat.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-orange-500 font-bold">g.</span>
                <span>Except for "Radical X" and "Park & Pound", Competitors may choose to have sensor placed in the front passenger's seat following the same guidelines as the driver's seat. Competitors must inform the judge of this choice prior to sensor being placed in the vehicle.</span>
              </li>
            </ul>
          </CollapsibleSection>

          <CollapsibleSection title="II. Objective">
            <p className="text-gray-300">
              <strong className="text-white">SPL - Sound Pressure League</strong> - working with criteria established in the Rule Book,
              will objectively evaluate each Competitor's vehicle to identify the loudest car/truck audio systems in the
              Sound Pressure (SPL) Format in these 5 Divisions: 2 Trunk (T) classes, 5 Street (S) classes,
              4 Modified Street (MS) classes, 5 Modified (M) classes, 2 "X" classes (XTC, X), and 5 Park & Pound format classes (DB).
              Systems/vehicles are categorized by complexity of design and potential as indicated by MECA's "Pressure Class" Formula.
            </p>
          </CollapsibleSection>

          <CollapsibleSection title="III. Format and Division Definitions">
            <div className="space-y-6 text-gray-300">
              <p className="text-white font-semibold">"Sound Pressure" Format - 18 "Pressure Classes" in 5 Divisions</p>

              <div>
                <h4 className="text-orange-400 font-semibold mb-2">Trunk (T1, T2)</h4>
                <p>The Trunk Division, with 2 "Pressure Classes", is intended for vehicles with systems installed in the Trunk.</p>
              </div>

              <div>
                <h4 className="text-orange-400 font-semibold mb-2">Street (S1, S2, S3, S4, S5)</h4>
                <p>The Street Division, with 5 "Pressure Classes", is intended for competitors with some vehicle and system modifications allowed. Vehicles are still intended to be daily drivers, must have a functional OEM backseat, and not SPL specific.</p>
              </div>

              <div>
                <h4 className="text-orange-400 font-semibold mb-2">Modified Street (MS1, MS2, MS3, MS4)</h4>
                <p>Modified street has 4 "Pressure Classes" and is intended for vehicles which do not have back seats, have no wall builds, or other installations which are done to the B-pillars (including pick up truck blow through installations where the cab is cut below the back glass). System and or box height is no more than 36 inches tall measured from the floor. In vehicles where the transmission tunnel goes behind the b-pillar, measurement will be taken from highest point parallel to the b pillar. This will define the 36-inch plane from the floor, or no more than 12 inches from the headliner measured from the tallest point of the enclosure. Anything attached to the enclosure is considered part of the enclosure including speaker surrounds and electronics amplifiers, speaker pods etc. The cutting of metal will be allowed inside the defined ICA (may not cut through the floor, roof or any side panels). For pick up trucks: They may still use bed as part of the ica however with the allowance of cut through, all pick up trucks will now have build height restrictions in the bed. All equipment including enclosure, amplifiers, batteries etc. may not exceed the top of the bed rails.</p>
              </div>

              <div>
                <h4 className="text-orange-400 font-semibold mb-2">Modified (M1, M2, M3, M4, M5)</h4>
                <p>The Modified Division with 5 "Pressure Classes" is intended for vehicles and systems that are designed to maximize sound pressure level, including woofer walls and pickup truck cut-through/blow-through installations, but are still capable of being daily drivers. M1,M2,M3, are restricted to vehicles that have modifications behind the B-pillars, within the original 4 planes of the vehicle, (Roof, Floor, and all side panels, must be intact and not be punctured via cutting). M4 and M5 allow for limited modifications in front of the B-pillars as well as structural, chassis, and/or body modifications behind the B-pillars and although they may be able to be driven daily, are designed strictly with SPL competition in mind.</p>
              </div>

              <div>
                <h4 className="text-orange-400 font-semibold mb-2">X (XS, XT, XMS, XM1, XM2, Extreme)</h4>
                <p>The "X" Division has 6 classes (four clamped classes and two unlimited) for systems/vehicles that want to meter at an alternate location (kick panel). Any combination of open/closed doors or hatches is acceptable, and sensor may be placed at either kick panel or on a mic stand 20" from the glass, and not within 12" of any port.</p>
              </div>

              <div>
                <h4 className="text-orange-400 font-semibold mb-2">"Park & Pound" (DB1, DB2, DB3, DB4, DB5) Format - 5 "Pressure Classes"</h4>
                <p>The "Park & Pound" Format, with 5 "Pressure Classes", is intended to measure sound pressure levels outside the vehicle, while playing full-range music.</p>
              </div>
            </div>
          </CollapsibleSection>
        </div>

        {/* Points Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">Points System</h2>

          <div className="bg-slate-800 rounded-xl p-6 mb-6">
            <p className="text-gray-300 mb-4">
              Now that we hopefully figured out your particular class let's dive into where everything lines up.
              First are how points are awarded.
            </p>
            <p className="text-orange-400 font-semibold mb-4">SPL & SQL points count for State Champion Program. For 1x, 2x and 3x only</p>

            <div className="space-y-4">
              <div className="bg-slate-700/50 rounded-lg p-4">
                <h4 className="text-white font-semibold mb-2">1X Single Point Event</h4>
                <p className="text-gray-300">1st through 5th places awarded points:</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded">1st = 5 pts</span>
                  <span className="px-3 py-1 bg-gray-500/20 text-gray-300 rounded">2nd = 4 pts</span>
                  <span className="px-3 py-1 bg-orange-700/20 text-orange-400 rounded">3rd = 3 pts</span>
                  <span className="px-3 py-1 bg-slate-600/50 text-gray-400 rounded">4th = 2 pts</span>
                  <span className="px-3 py-1 bg-slate-600/50 text-gray-400 rounded">5th = 1 pt</span>
                </div>
              </div>

              <div className="bg-slate-700/50 rounded-lg p-4">
                <h4 className="text-white font-semibold mb-2">2X Double Points Event</h4>
                <p className="text-gray-300">1st through 5th places awarded points:</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded">1st = 10 pts</span>
                  <span className="px-3 py-1 bg-gray-500/20 text-gray-300 rounded">2nd = 8 pts</span>
                  <span className="px-3 py-1 bg-orange-700/20 text-orange-400 rounded">3rd = 6 pts</span>
                  <span className="px-3 py-1 bg-slate-600/50 text-gray-400 rounded">4th = 4 pts</span>
                  <span className="px-3 py-1 bg-slate-600/50 text-gray-400 rounded">5th = 2 pts</span>
                </div>
              </div>

              <div className="bg-slate-700/50 rounded-lg p-4">
                <h4 className="text-white font-semibold mb-2">3X Triple Points Event - SOUNDFEST</h4>
                <p className="text-gray-300">1st through 5th places awarded points:</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded">1st = 15 pts</span>
                  <span className="px-3 py-1 bg-gray-500/20 text-gray-300 rounded">2nd = 12 pts</span>
                  <span className="px-3 py-1 bg-orange-700/20 text-orange-400 rounded">3rd = 9 pts</span>
                  <span className="px-3 py-1 bg-slate-600/50 text-gray-400 rounded">4th = 6 pts</span>
                  <span className="px-3 py-1 bg-slate-600/50 text-gray-400 rounded">5th = 3 pts</span>
                </div>
              </div>

              <div className="bg-slate-700/50 rounded-lg p-4">
                <h4 className="text-white font-semibold mb-2">4X Points Event</h4>
                <p className="text-gray-300 mb-2">
                  For SQ, Install, RTA, and SQ2/SQ2+ events. 1st through 5th places awarded points:
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded">1st = 20 pts</span>
                  <span className="px-3 py-1 bg-gray-500/20 text-gray-300 rounded">2nd = 19 pts</span>
                  <span className="px-3 py-1 bg-orange-700/20 text-orange-400 rounded">3rd = 18 pts</span>
                  <span className="px-3 py-1 bg-slate-600/50 text-gray-400 rounded">4th = 17 pts</span>
                  <span className="px-3 py-1 bg-slate-600/50 text-gray-400 rounded">5th = 16 pts</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SP Format Details */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">SP - Sound Pressure Format</h2>
          <div className="bg-slate-800 rounded-xl p-6 mb-4">
            <p className="text-gray-300">
              Measures dB inside the vehicle. 16 "Pressure Classes" in 4 Divisions, 5 Exhibition Classes.
              Competitor's score in SP measured at the headrest.
            </p>
          </div>

          <CollapsibleSection title="D. Sensor Placement (SPL Format)">
            <ul className="space-y-3 text-gray-300">
              <li className="flex gap-2">
                <span className="text-orange-500 font-bold">a.</span>
                <span>Competitor cannot touch or move sensor or stand at any time. Competitor may not sit on the same side of the vehicle where the sensor is placed.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-orange-500 font-bold">b.</span>
                <span>Sensor placed on MECA approved stand or holder, provided by Judge, 26" High in the Driver's Seat. The seat and seat back of the seat that the sensor stand is placed in must be in a factory locked position and must allow the stand to sit flat on the seat bottom. The stand may not be leaned forward.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-orange-500 font-bold">c.</span>
                <span>Sensor faces front of vehicle at all times in horizontal position, except for "Park & Pound".</span>
              </li>
              <li className="flex gap-2">
                <span className="text-orange-500 font-bold">d.</span>
                <span>With the seat in a factory latched position, the sensor stand will be placed in the center of the seat with the rear of stand touching the seat-back, or be as close as possible.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-orange-500 font-bold">e.</span>
                <span>With the sensor and stand placed, the seat must be moved to place the sensor a distance of 20" from the windshield as measured on the horizontal plane, except for "Radical X" and "Park & Pound".</span>
              </li>
              <li className="flex gap-2">
                <span className="text-orange-500 font-bold">f.</span>
                <span>If the Competitor's seat is not able to move forward enough for the sensor to reach 20", then with the seat in the forward most latched position, the stand will be moved forward to allow the sensor to reach 20", and may weighted down with sandbags or equivalent. However, the base of the sensor stand must still be completely on the seat.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-orange-500 font-bold">g.</span>
                <span>Except for "Radical X" and "Park & Pound", Competitors may choose to have sensor placed in the front passenger's seat following the same guidelines as the driver's seat. Competitors must inform the judge of this choice prior to sensor being placed in the vehicle.</span>
              </li>
            </ul>
          </CollapsibleSection>
        </div>

        {/* Park & Pound Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">Park & Pound Format</h2>
          <div className="bg-slate-800 rounded-xl p-6 mb-4">
            <p className="text-gray-300">
              <strong className="text-white">Park & Pound</strong> - Intended to be a format for all daily driven vehicles to test their ability
              to impress listeners as they drive by on the street, measuring sound pressure level outside the vehicle.
              Measures dB outside the vehicle, in 5 "Pressure Classes", while playing full-range music.
            </p>
          </div>

          <CollapsibleSection title="A. Vehicle Requirements">
            <ul className="space-y-3 text-gray-300">
              <li className="flex gap-2">
                <span className="text-orange-500 font-bold">i.</span>
                <span>No one may be in the vehicle during pass. System must be operated by remote, external head unit, or podium. Prior to the start of the test or immediately following the test, a competitor may lean into vehicle to start or stop the test (with hearing protection on). Competitor must exit vehicle completely and move away from the vehicle to signal that Park & Pound test to begin.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-orange-500 font-bold">ii.</span>
                <span>Vehicle is to be driven into the lanes, perpendicular to the meter, and parked.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-orange-500 font-bold">iii.</span>
                <span>Once parked & meters set, the Competitor has two (2) minutes to get out of the vehicle, shut the door, set-up, and begin their official pass.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-orange-500 font-bold">iv.</span>
                <span>As long as they are properly wearing hearing protection and their head remains outside the vehicle, the Competitor may lean in the window to adjust volume, change, or pause the track but may not manipulate any other equipment.</span>
              </li>
            </ul>
          </CollapsibleSection>

          <CollapsibleSection title="C. Judging Criteria">
            <ul className="space-y-3 text-gray-300">
              <li className="flex gap-2">
                <span className="text-orange-500 font-bold">i.</span>
                <span>Windows & doors may be open. Windows in front of B-pillars may be removed. Hood must be closed. T-tops, sunroofs, or moon roofs may be open or removed (if designed to be removed without tools), convertible tops may be down. Soft top vehicles will be considered convertibles.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-orange-500 font-bold">ii.</span>
                <span>Competitor must play musical track(s), (i.e. songs) in which the bass notes vary and are not sustained for longer than 5 seconds each. Thus, no tones, sweeps, and/or bass only tracks. The Term Lab "spectrum analyzer" will be displayed and used to determine that bass notes are not sustained.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-orange-500 font-bold">iii.</span>
                <span>Competitors must use commercially available music tracks. Effective in 2017, Burnt CD's, iPods, MP3 players, etc. will be allowed at all 1X, 2X, and 3X contests as well as MECA World Finals.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-orange-500 font-bold">iv.</span>
                <span>Competitors may only use one source unit during pass. The Mids. and Highs being played must be from the same source as the bass from the sub woofers.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-orange-500 font-bold">v.</span>
                <span>Mids. and highs must be able to be heard outside the vehicle along with the bass.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-orange-500 font-bold">vi.</span>
                <span>Lyrics in song may not include any foul or offensive language.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-orange-500 font-bold">vii.</span>
                <span>No bracing teams allowed.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-orange-500 font-bold">viii.</span>
                <span>Peak frequency must not exceed 100hz, as verified by Term Lab metering system.</span>
              </li>
            </ul>
          </CollapsibleSection>

          <CollapsibleSection title="D. Sensor Placement (Park & Pound)">
            <ul className="space-y-3 text-gray-300">
              <li className="flex gap-2">
                <span className="text-orange-500 font-bold">i.</span>
                <span>In addition to the General Rules, sensor will be placed 72" (6') from the outside edge of a marker on the ground (usually a cone), on passenger side of the vehicle; 54" (4.5') off the ground on MECA approved stand.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-orange-500 font-bold">ii.</span>
                <span>Competitors who hit the marker either entering or exiting the judging lane will have their pass disqualified. In the event of a minor hit (i.e. running over the base of a cone) the Competitor may be granted a retry at the Judge's discretion.</span>
              </li>
            </ul>
          </CollapsibleSection>

          <CollapsibleSection title="E. System Requirements (Park & Pound)">
            <ul className="space-y-3 text-gray-300">
              <li className="flex gap-2">
                <span className="text-orange-500 font-bold">i.</span>
                <span>For DB1, DB2, DB3, and DB4 there are no modifications to the front of the vehicle with the intent to increase sound pressure level score, except for the modifications outlined in E.ii. through E.ix. As an unlimited class, DB5 will follow sections A&D of the "Radical X" Rules and allow "Radical X" vehicles which still meet sections A and B of the "Park & Pound" Rules to compete in "Park & Pound".</span>
              </li>
              <li className="flex gap-2">
                <span className="text-orange-500 font-bold">ii.</span>
                <span>Enclosure or anything attached to the enclosure cannot extend more than one inch (1") past any part of the front door jambs, except in a standard cab truck where it must fit with the driver's seat in the most forward position.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-orange-500 font-bold">iii.</span>
                <span>Door panels may be modified, rebuilt, removed, or built out (3/4" maximum).</span>
              </li>
              <li className="flex gap-2">
                <span className="text-orange-500 font-bold">iv.</span>
                <span>Headliner may be removed or replaced, but may be no thicker than 3/4".</span>
              </li>
              <li className="flex gap-2">
                <span className="text-orange-500 font-bold">v.</span>
                <span>Sound deadening materials are allowed to be used in front the B-pillars, their application may not alter the placement of the headliner, carpet, or any panel in front of the B-pillar.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-orange-500 font-bold">vi.</span>
                <span>Vehicle must have automotive seats in the forward only position. Both front seats must be properly mounted in the vehicle. Seats may be replaced, providing they are still a DOT approved automotive seat; no homemade, marine, or other types allowed.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-orange-500 font-bold">vii.</span>
                <span>Standard Cab Pick-ups: If aftermarket seats or factory replacement seats are added, and the factory brackets aren't used, then the brackets to hold said seats down must be made to line up with the rear factory bolts as to not increase the area behind said seats.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-orange-500 font-bold">viii.</span>
                <span>Center consoles may be removed or rebuilt as long as the design does not intentionally redirect pressure, which may increase SPL score.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-orange-500 font-bold">ix.</span>
                <span>Batteries must be securely mounted, and must be located either under the hood, in the factory location, and/or be mounted anywhere behind the B-pillars, within the original skin of the vehicle, or be mounted under the vehicle in a battery box. Battery box may be a separate unit mounted under the vehicle or be installed through a hole cut in the floor. Battery box must provide protection from the outside and may not hinder the vehicle's ability to be driven safely.</span>
              </li>
            </ul>
          </CollapsibleSection>
        </div>

        {/* BOBOS Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">IV. Best of the Best of Show (BOBOS) Award</h2>
          <div className="bg-slate-800 rounded-xl p-6">
            <p className="text-gray-300 mb-4">
              The winner of this award will be the Competitor with the best overall audio system performance at an event
              based on their competition results, determined by the following scoring system:
            </p>
            <ul className="space-y-3 text-gray-300 mb-6">
              <li className="flex gap-2">
                <span className="text-orange-500">*</span>
                <span>BOBOS Competitors must enter SP (non-X class) and SQ to qualify for the award. Park & Pound, Install, and RTA Freq Out points will be added to get the overall BOBOS score.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-orange-500">*</span>
                <span>Using the Competitor's score in SP measured at the headrest, Park & Pound, SQ, RTA, and Install, those scores will be totaled to get an overall score, with the highest overall score winning BOBOS.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-orange-500">*</span>
                <span>SP offers a maximum score of 150 dB, Park & Pound offers a maximum score of 130 dB, SQ is a maximum of 100 points, RTA Freq Out is a maximum of 100 points, and Install has a maximum of 100 points.</span>
              </li>
            </ul>

            <div className="bg-slate-700/50 rounded-lg p-4 mb-4">
              <h4 className="text-white font-semibold mb-2">Example Calculation:</h4>
              <p className="text-gray-300 text-sm">
                If a competitor has a 152.5 dB in SP at the headrest, 126.1 dB in Park & Pound, a 78 in SQ, a 64 in RTA, and 81 in Install,
                then it would be calculated as: SP is capped at 150 dB and the RTA Freq out score is doubled.
                So, 150+126.1+78+64+81 = <span className="text-orange-400 font-bold">499</span>
              </p>
            </div>

            <div className="bg-slate-700/50 rounded-lg p-4 mb-4">
              <h4 className="text-white font-semibold mb-2">Tiebreakers (in order):</h4>
              <ol className="list-decimal list-inside text-gray-300 space-y-1">
                <li>SQ Score</li>
                <li>SPL Score</li>
                <li>Install Score</li>
                <li>Park & Pound Score</li>
                <li>RTA Freq Out Score</li>
              </ol>
            </div>

            <p className="text-gray-400 text-sm">
              <strong>Note:</strong> Even if they are offered, SQ2, Show & Shine, Ride the Light, Boom & Zoom, or Dueling Demos are not factored into the BOBOS scoring. Phat awards and Best of Show awards are not factored into the BOBOS scoring.
            </p>
          </div>
        </div>

        {/* MECA SQL Section */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-blue-500 mb-6 flex items-center">
            <span className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">2</span>
            MECA SQL
          </h2>

          <div className="bg-slate-800 rounded-xl p-6 mb-6">
            {!loading && sqlRulebookUrl && (
              <a
                href={sqlRulebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors mb-4"
              >
                <BookOpen className="w-4 h-4 mr-2" />
                Sound Quality Rule Book {currentSeason?.year}
                <ExternalLink className="w-4 h-4 ml-2" />
              </a>
            )}
            <p className="text-gray-300 mb-4">
              MECA is the sanctioning body for competitors involved with car audio sports. MECA is a membership association
              formed to encourage, support, and reward competitors involved in car audio sports. This Rule Book is intended
              to outline the specifics of competition in the Sound Quality League (SQL). It is the responsibility of each
              competitor to review, comply, and honor the rules in cooperation with event officials. MECA strives to present
              every competitor with a fair and unbiased forum in which competition is regarded as worthwhile and enjoyable.
              Intentional cheating and/or manipulation of the rules will result in permanent suspension from MECA competitions and events.
            </p>
          </div>

          <CollapsibleSection title="Objective">
            <p className="text-gray-300">
              The <strong className="text-white">Sound Quality League (SQL)</strong> working with the established criteria in the MECA Rule Book,
              will objectively evaluate each competitor's vehicle and system. Appropriate and individual attention is given to
              Sound Quality (SQ), Installation (Install), and Real Time Analysis (RTA Freq Out).
              MECA's SQL philosophy reflects the importance and regard for the best sound quality presented to the judges.
            </p>
          </CollapsibleSection>

          <CollapsibleSection title="Format and Class Guidelines">
            <div className="space-y-4 text-gray-300">
              <p className="text-white font-semibold mb-4">Sound Quality Format - brief descriptions below for each class, see full rules for classification purposes</p>

              <div className="space-y-4">
                <div className="bg-slate-700/30 rounded-lg p-4">
                  <h4 className="text-blue-400 font-semibold mb-2">Stock</h4>
                  <p className="text-sm">Aftermarket head unit or 12V external processor limited to 16-bands of EQ cumulative per channel. Speakers must be installed in stock locations with no modifications to any panels or metal. 30mm (1.18") tweeters or smaller allowed to be built out on a-pillar or sail panels.</p>
                </div>

                <div className="bg-slate-700/30 rounded-lg p-4">
                  <h4 className="text-blue-400 font-semibold mb-2">Street</h4>
                  <p className="text-sm">12V processor with unlimited bands allowed with minor cutting for door speaker installation. A-pillar or sail panel modification allowed for a single pair of 2" speakers or smaller.</p>
                </div>

                <div className="bg-slate-700/30 rounded-lg p-4">
                  <h4 className="text-blue-400 font-semibold mb-2">Modified Street</h4>
                  <p className="text-sm">Minor cosmetic modifications allowed in speaker install. Rear vision capability not required (walls allowed). Kick panels allowed with up to 6.5" speaker. A-pillar, sail panel modification, and/or dash pod build out allowed for 2.5" speaker or smaller and/or a 30mm (1.18") tweeter or smaller.</p>
                </div>

                <div className="bg-slate-700/30 rounded-lg p-4">
                  <h4 className="text-blue-400 font-semibold mb-2">Modified</h4>
                  <p className="text-sm">A-pillar/sail panel build outs and dash pods allowed with maximum of 4" speakers (width and height restrictions apply). Door panels may be modified or rebuilt. Sub woofer(s) may be installed in any part of the vehicle. 8-inch seat rail extensions allowed.</p>
                </div>

                <div className="bg-slate-700/30 rounded-lg p-4">
                  <h4 className="text-blue-400 font-semibold mb-2">Modex</h4>
                  <p className="text-sm">Partial cutouts on dashboard allowed (size and height restrictions apply). Seat rail extensions allowed with no limit. Venting to exterior of vehicle allowed (within size limits forward of b-pillar).</p>
                </div>

                <div className="bg-slate-700/30 rounded-lg p-4">
                  <h4 className="text-blue-400 font-semibold mb-2">Master</h4>
                  <p className="text-sm">Anything goes, required for Manufacturers' vehicles or elective to anyone that chooses to compete in the class.</p>
                </div>
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Install Format Classes">
            <ul className="space-y-2 text-gray-300">
              <li><span className="text-blue-400 font-semibold">Stock</span></li>
              <li><span className="text-blue-400 font-semibold">Street</span> - Includes vehicles that qualify for Street and Modified Street SQ classes</li>
              <li><span className="text-blue-400 font-semibold">Modified</span> - Includes vehicles that qualify for Modified and Modex SQ classes</li>
              <li><span className="text-blue-400 font-semibold">Extreme</span> - Includes vehicles that qualify for Extreme and Master SQ classes</li>
            </ul>
          </CollapsibleSection>

          <CollapsibleSection title="RTA Freq Out Format">
            <p className="text-gray-300">One open class for all Sound Quality League Competitors.</p>
          </CollapsibleSection>

          <CollapsibleSection title="SQ2 Format">
            <ul className="space-y-2 text-gray-300">
              <li><span className="text-blue-400 font-semibold">SQ2</span> - Includes systems that qualify for Stock, Street, and Modified Street SQ classes</li>
              <li><span className="text-blue-400 font-semibold">SQ2+</span> - Includes systems that qualify for Modified, Modex, Extreme, and Master SQ classes</li>
            </ul>
          </CollapsibleSection>
        </div>

        {/* Footer CTA */}
        <div className="bg-gradient-to-r from-orange-500/10 to-blue-500/10 rounded-xl p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Ready to Compete?</h2>
          <p className="text-gray-300 mb-6">
            Find upcoming MECA events near you and register to compete!
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/events"
              className="inline-flex items-center px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors"
            >
              View Events
            </Link>
            <Link
              to="/rulebooks"
              className="inline-flex items-center px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
            >
              <BookOpen className="w-5 h-5 mr-2" />
              Full Rulebooks
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
