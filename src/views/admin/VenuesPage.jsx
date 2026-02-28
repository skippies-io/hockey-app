import React from "react";
import DirectoryPage from "./DirectoryPage";
import { directoryStyles as styles } from "./adminDirectoryStyles";
import { adminUrl, buildRequest, linkLabel } from "./directoryUtils";

const emptyForm = { name: "", address: "", location_map_url: "", website_url: "" };

const fields = [
  { key: "name", label: "Name", placeholder: "Main Turf", id: "venue-name" },
  { key: "address", label: "Address", placeholder: "123 Example Rd, City", id: "venue-address" },
  { key: "location_map_url", label: "Map URL", placeholder: "https://maps.google.com/...", id: "venue-map" },
  { key: "website_url", label: "Website", placeholder: "https://...", id: "venue-website" },
];

const columns = [
  { key: "name", label: "Name", editable: true },
  { key: "address", label: "Address", editable: true },
  {
    key: "location_map_url",
    label: "Map URL",
    editable: true,
    render: (venue) =>
      venue.location_map_url ? (
        <a
          href={venue.location_map_url}
          target="_blank"
          rel="noreferrer"
          style={styles.urlText}
          title={venue.location_map_url}
        >
          {linkLabel(venue.location_map_url, "Open map")}
        </a>
      ) : (
        ""
      ),
  },
  {
    key: "website_url",
    label: "Website",
    editable: true,
    render: (venue) =>
      venue.website_url ? (
        <a
          href={venue.website_url}
          target="_blank"
          rel="noreferrer"
          style={styles.urlText}
          title={venue.website_url}
        >
          {linkLabel(venue.website_url, "Open site")}
        </a>
      ) : (
        ""
      ),
  },
];

export default function VenuesPage() {
  return (
    <DirectoryPage
      title="Venues"
      subtitle="Manage venues and map links for directions."
      addTitle="Add Venue"
      listTitle="Venue List"
      emptyMessage="No venues yet."
      confirmDeleteMessage="Remove this venue? This cannot be undone."
      fields={fields}
      columns={columns}
      sortItems={(a, b) => (a.name || "").localeCompare(b.name || "")}
      getInitialForm={() => emptyForm}
      buildEditData={(venue) => ({
        name: venue.name || "",
        address: venue.address || "",
        location_map_url: venue.location_map_url || "",
        website_url: venue.website_url || "",
      })}
      validateCreate={(form) => (!form.name.trim() ? "Venue name is required." : "")}
      validateEdit={(form) => (!form.name.trim() ? "Venue name is required." : "")}
      getListUrl={() => adminUrl("venues")}
      getCreateRequest={(form) =>
        buildRequest(adminUrl("venues"), "POST", {
          name: form.name,
          address: form.address,
          location_map_url: form.location_map_url,
          website_url: form.website_url,
        })
      }
      getUpdateRequest={(venue, form) =>
        buildRequest(adminUrl(`venues/${venue.id}`), "PUT", {
          name: form.name,
          address: form.address,
          location_map_url: form.location_map_url,
          website_url: form.website_url,
        })
      }
      getDeleteRequest={(venue) => buildRequest(adminUrl(`venues/${venue.id}`), "DELETE")}
    />
  );
}
