import AnnouncementBanner from "./AnnouncementBanner";

export default {
  title: "Components/AnnouncementBanner",
  component: AnnouncementBanner,
  parameters: { layout: "padded" },
};

const makeAnn = (id, title, body, severity) => ({ id, title, body, severity });

export const Info = {
  args: {
    announcements: [makeAnn("1", "Schedule update", "All U12 games have moved to Pitch 3.", "info")],
  },
};

export const Warning = {
  args: {
    announcements: [makeAnn("2", "Delayed start", "Kick-off pushed back 30 minutes due to pitch prep.", "warning")],
  },
};

export const Alert = {
  args: {
    announcements: [makeAnn("3", "Game cancelled", "U12B vs U12D has been cancelled — no replay scheduled.", "alert")],
  },
};

export const Success = {
  args: {
    announcements: [makeAnn("4", "Results published", "All Saturday scores are now live.", "success")],
  },
};

export const Multiple = {
  args: {
    announcements: [
      makeAnn("5", "Schedule update", "Pool B games moved to Pitch 2.", "info"),
      makeAnn("6", "Weather alert", "Pitch 1 closed until further notice.", "warning"),
    ],
  },
};

export const Empty = {
  args: { announcements: [] },
};
