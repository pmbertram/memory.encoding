# Memory Encoding Experiment

A static browser-based free-recall experiment comparing:
1. Maintenance rehearsal
2. Self-reference
3. Mental imagery

## Run it
- Keep `index.html`, `styles.css`, and `script.js` in the same folder.
- Open `index.html` in a current desktop or mobile browser.
- No server, database, framework, installation, or build step is required.
- Internet is not required for the experiment; the optional Google Fonts import falls back to system fonts when offline.

## Procedure
- The three encoding strategies are randomized for each session.
- Three six-word lists are independently shuffled and assigned to the strategies.
- Words appear individually for four seconds.
- A 30-second backward-counting distractor follows the three encoding blocks.
- Participants then freely recall and submit words in any order.
- Results are displayed by strategy, with summary and trial-level CSV downloads.

## Scoring note
Scoring ignores capitalization and accepts conservative one- or two-character spelling differences using edit distance. Each response token and each studied word can be matched only once. Automatic typo matching is not perfect; inspect raw recall responses and matched responses in the CSVs when data quality matters. The scoring algorithm does not understand synonyms (for example, “bike” for “bicycle”) or all possible misspellings.

## Data files
- Summary CSV: one row per session, including strategy order, list assignment, scores, distractor response, and free-recall response.
- Trial-level CSV: 18 rows per session, one per studied word, including strategy, block position, list assignment, and recall accuracy.

All data remain in the participant's browser until downloaded. There is no server-side storage or transmission. Download both CSV files before refreshing or closing the page.

## Research-use considerations
This is a working prototype, not a validated experimental platform. For formal data collection, consider piloting timing and instructions, standardizing device/browser conditions, obtaining appropriate consent/ethics approval, and checking the automatic scoring against human review. Word lists are illustrative and have not been normed or matched for difficulty.
