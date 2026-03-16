import PageHeading from "./PageHeading";

export default {
  title: "Components/PageHeading",
  component: PageHeading,
  parameters: { layout: "padded" },
};

export const TitleOnly = {
  args: {
    title: "U12 Boys",
  },
};

export const WithSubtitle = {
  args: {
    title: "U12 Boys",
    subtitle: "Spring Cup 2026 · Pool A",
  },
};
