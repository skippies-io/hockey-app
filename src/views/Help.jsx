import Card from "../components/Card";

const sections = [
  {
    id: "fixtures",
    title: "Viewing Fixtures",
    body: (
      <>
        <p>Select your age group from the <strong>Age</strong> dropdown at the top of the screen, then tap <strong>Fixtures</strong> in the navigation bar.</p>
        <p>Each fixture card shows the date, time, venue, and both teams. Scores appear once a match has been played.</p>
        <p>Use the pool filter to narrow results to a specific pool within your age group.</p>
      </>
    ),
  },
  {
    id: "standings",
    title: "Standings",
    body: (
      <>
        <p>Tap <strong>Standings</strong> to see the league table for your selected age group and pool.</p>
        <p>Columns show: Games Played (GP), Wins (W), Draws (D), Losses (L), Goals For (GF), Goals Against (GA), Goal Difference (GD), and Points (Pts).</p>
      </>
    ),
  },
  {
    id: "teams",
    title: "Following Teams",
    body: (
      <>
        <p>Tap <strong>Teams</strong> to see all teams in your age group. Press the <strong>☆</strong> star next to a team name to follow it.</p>
        <p>Once you follow teams, use the <strong>Show Followed</strong> toggle on the Teams, Fixtures, and Standings views to filter the list to only your starred teams.</p>
        <p>Followed teams are saved on your device — no account required.</p>
      </>
    ),
  },
  {
    id: "awards",
    title: "Awards",
    body: (
      <>
        <p>Tap <strong>Awards</strong> to see the Top Scorers and Clean Sheets leaderboards for the current tournament.</p>
        <p>The tables update automatically as results and goalscorers are entered by tournament staff.</p>
      </>
    ),
  },
  {
    id: "calendar",
    title: "Adding Fixtures to Your Calendar",
    body: (
      <>
        <p>Open the <strong>Fixtures</strong> view and look for the <strong>Add to Calendar</strong> button near the top of the page.</p>
        <p>Tapping it downloads an <strong>.ics file</strong> that you can import into Google Calendar, Apple Calendar, or Outlook. The file includes all fixtures for your selected age group.</p>
      </>
    ),
  },
  {
    id: "digest",
    title: "Digest Share Links",
    body: (
      <>
        <p>Tournament administrators can generate a <strong>Digest link</strong> — a read-only page showing standings and fixtures for a specific age group.</p>
        <p>If you receive a digest link, simply open it in your browser. No login is required. Links expire after the date shown on the page.</p>
      </>
    ),
  },
  {
    id: "tournaments",
    title: "Switching Tournaments",
    body: (
      <>
        <p>Use the <strong>Tournament</strong> switcher in the top-right corner of the header to move between active tournaments.</p>
        <p>Tap <strong>Tournaments</strong> in the nav to see a directory of all public tournaments.</p>
      </>
    ),
  },
  {
    id: "install",
    title: "Installing the App",
    body: (
      <>
        <p>Hockey For Juniors works as a Progressive Web App (PWA). You can add it to your home screen for quick access and limited offline support.</p>
        <ul>
          <li><strong>Android / Chrome:</strong> Tap the browser menu → <em>Add to Home screen</em>.</li>
          <li><strong>iPhone / Safari:</strong> Tap the Share icon → <em>Add to Home Screen</em>.</li>
        </ul>
        <p>An install prompt may also appear automatically the first time you visit.</p>
      </>
    ),
  },
];

export default function Help() {
  return (
    <div className="page-stack help-page" aria-labelledby="help-heading">
      <section className="page-section">
        <Card>
          <h2 id="help-heading" className="section-title pool-head">User Guide</h2>
          <p>Everything you need to know about using Hockey For Juniors.</p>
        </Card>
      </section>

      {sections.map((s) => (
        <section key={s.id} className="page-section" aria-labelledby={`help-${s.id}`}>
          <Card>
            <h3 id={`help-${s.id}`} className="section-title">{s.title}</h3>
            {s.body}
          </Card>
        </section>
      ))}
    </div>
  );
}
