import Card from "./Card";

export default {
  title: "Components/Card",
  component: Card,
  parameters: { layout: "centered" },
};

export const Default = {
  args: {
    children: "A basic card with some content inside.",
  },
};

export const Followed = {
  args: {
    children: "A card highlighting a followed team.",
    followed: true,
  },
};

export const NoPadding = {
  args: {
    children: "Card with no internal padding.",
    noPad: true,
  },
};

export const WithCustomContent = {
  args: {
    children: (
      <div>
        <h3 style={{ margin: "0 0 8px" }}>Pool A</h3>
        <p style={{ margin: 0, fontSize: "13px", color: "#666" }}>3 teams · Round robin</p>
      </div>
    ),
  },
};
