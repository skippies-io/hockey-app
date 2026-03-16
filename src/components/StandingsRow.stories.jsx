import StandingsRow from "./StandingsRow";

export default {
  title: "Components/StandingsRow",
  component: StandingsRow,
  parameters: { layout: "padded" },
  decorators: [
    // eslint-disable-next-line no-unused-vars
    (Story) => (
      <div style={{ width: "380px" }}>
        <Story />
      </div>
    ),
  ],
};

const base = {
  rank: 1,
  teamName: "Wanderers",
  badgeColor: "#1a5276",
  initials: "WAN",
  played: 3,
  won: 3,
  drawn: 0,
  lost: 0,
  gf: 8,
  ga: 2,
  gd: 6,
  points: 9,
};

export const Leader = { args: { ...base } };

export const Followed = {
  args: { ...base, isFollowed: true, onToggleFollow: () => {} },
};

export const NotFollowed = {
  args: { ...base, rank: 2, teamName: "City Hawks", badgeColor: "#922b21", initials: "CHK", points: 6, won: 2, lost: 1, gf: 5, ga: 4, gd: 1, isFollowed: false, onToggleFollow: () => {} },
};

export const Bottom = {
  args: { ...base, rank: 4, teamName: "Rovers", badgeColor: "#7d6608", initials: "ROV", played: 3, won: 0, drawn: 0, lost: 3, gf: 1, ga: 9, gd: -8, points: 0 },
};
