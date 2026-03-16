import StatPill from "./StatPill";

export default {
  title: "Components/StatPill",
  component: StatPill,
  parameters: { layout: "centered" },
};

export const Default = {
  args: {
    label: "Points",
    value: 9,
  },
};

export const Strong = {
  args: {
    label: "Points",
    value: 9,
    emphasis: "strong",
  },
};

export const GoalDifference = {
  args: {
    label: "GD",
    value: "+5",
    emphasis: "strong",
  },
};

export const Zero = {
  args: {
    label: "Goals",
    value: 0,
  },
};
