import NotificationBell from "./NotificationBell";

export default {
  title: "Components/NotificationBell",
  component: NotificationBell,
  parameters: { layout: "centered" },
};

const ANNS = [
  { id: "a1", title: "Field change", body: "Game moved to pitch 2.", severity: "info" },
  { id: "a2", title: "Cancelled", body: "U12B game cancelled due to weather.", severity: "alert" },
];

export const NoNotifications = {
  args: { announcements: [] },
  name: "No notifications (hidden)",
};

export const WithUnread = {
  args: { announcements: ANNS },
  name: "2 unread",
};

export const SingleUnread = {
  args: { announcements: [ANNS[0]] },
  name: "1 unread",
};
