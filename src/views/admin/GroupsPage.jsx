import React from "react";
import DirectoryPage from "./DirectoryPage";
import { adminUrl, buildRequest } from "./directoryUtils";

const emptyForm = { id: "", label: "", format: "Round-robin" };

const fields = [
  { key: "id", label: "Group ID", placeholder: "U11B", id: "group-id" },
  { key: "label", label: "Label", placeholder: "U11 Boys", id: "group-label" },
  { key: "format", label: "Format", placeholder: "Round-robin", id: "group-format" },
];

const columns = [
  { key: "id", label: "Group ID" },
  { key: "label", label: "Label", editable: true },
  { key: "format", label: "Format", editable: true },
];

export default function GroupsPage() {
  return (
    <DirectoryPage
      title="Groups"
      subtitle="Manage group IDs and labels for tournament setup."
      addTitle="Add Group"
      listTitle="Group List"
      emptyMessage="No groups yet."
      confirmDeleteMessage="Remove this group? This cannot be undone."
      fields={fields}
      columns={columns}
      sortItems={(a, b) => (a.id || "").localeCompare(b.id || "")}
      getInitialForm={() => ({ ...emptyForm })}
      buildEditData={(group) => ({
        id: group.id || "",
        label: group.label || "",
        format: group.format || "",
      })}
      validateCreate={(form) =>
        !form.id.trim() || !form.label.trim() ? "Group ID and Label are required." : ""
      }
      validateEdit={(form) => (!form.label.trim() ? "Group label is required." : "")}
      getListUrl={() => adminUrl("groups")}
      getCreateRequest={(form) =>
        buildRequest(adminUrl("groups"), "POST", {
          id: form.id,
          label: form.label,
          format: form.format,
        })
      }
      getUpdateRequest={(group, form) =>
        buildRequest(adminUrl(`groups/${group.id}`), "PUT", {
          label: form.label,
          format: form.format,
        })
      }
      getDeleteRequest={(group) => buildRequest(adminUrl(`groups/${group.id}`), "DELETE")}
    />
  );
}
