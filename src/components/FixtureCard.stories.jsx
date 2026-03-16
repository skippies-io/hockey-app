import FixtureCard from "./FixtureCard";

export default {
  title: "Components/FixtureCard",
  component: FixtureCard,
  parameters: { layout: "padded" },
  decorators: [
    // eslint-disable-next-line no-unused-vars
    (Story) => (
      <div style={{ maxWidth: "480px", width: "100%" }}>
        <Story />
      </div>
    ),
  ],
};

const base = {
  date: "2026-03-22",
  time: "10:00",
  venueName: "Pitch 1",
  pool: "Pool A",
  round: "Round 3",
  homeTeam: "Wanderers",
  awayTeam: "City Hawks",
  showDate: true,
  showPool: true,
};

export const Upcoming = {
  args: { ...base, status: "upcoming" },
};

export const Final = {
  args: { ...base, status: "final", homeScore: 3, awayScore: 1 },
};

export const Live = {
  args: { ...base, status: "live", homeScore: 1, awayScore: 1 },
};

export const Postponed = {
  args: { ...base, status: "postponed" },
};

export const Cancelled = {
  args: { ...base, status: "cancelled" },
};

export const WithFollowedTeam = {
  args: {
    ...base,
    status: "upcoming",
    homeIsFollowed: true,
    onToggleHomeFollow: () => {},
    onToggleAwayFollow: () => {},
  },
  name: "Home team followed",
};

export const Expandable = {
  args: {
    ...base,
    status: "final",
    homeScore: 2,
    awayScore: 0,
    expandable: true,
    notes: "Great performance by the home side.",
  },
};
