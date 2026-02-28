import React, { useCallback, useEffect, useMemo, useState } from "react";
import DirectoryPage from "./DirectoryPage";
import { API_BASE } from "../../lib/api";
import { directoryStyles as styles } from "./adminDirectoryStyles";
import { adminUrl, buildRequest } from "./directoryUtils";

const emptyForm = {
  tournament_id: "",
  name: "",
  logo_url: "",
  manager_name: "",
  manager_photo_url: "",
  description: "",
  contact_phone: "",
  location_map_url: "",
  contact_email: "",
};

const fields = [
  { key: "name", label: "Name", placeholder: "Purple Panthers", id: "franchise-name" },
  { key: "logo_url", label: "Logo URL", placeholder: "https://...", id: "franchise-logo" },
  { key: "manager_name", label: "Manager Name", placeholder: "Manager name", id: "franchise-manager" },
  {
    key: "manager_photo_url",
    label: "Manager Photo URL",
    placeholder: "https://...",
    id: "franchise-manager-photo",
  },
  {
    key: "contact_phone",
    label: "Contact Phone",
    placeholder: "+27...",
    id: "franchise-contact",
  },
  {
    key: "contact_email",
    label: "Contact Email",
    placeholder: "name@example.com",
    id: "franchise-email",
  },
  {
    key: "location_map_url",
    label: "Location Map URL",
    placeholder: "https://maps.google.com/...",
    id: "franchise-map",
  },
  {
    key: "description",
    label: "Description",
    placeholder: "Franchise description",
    id: "franchise-desc",
    inputType: "textarea",
    rows: 2,
  },
];

const columns = [
  { key: "tournament_id", label: "Tournament" },
  { key: "name", label: "Name", editable: true },
  { key: "manager_name", label: "Manager", editable: true },
  {
    key: "contact_email",
    label: "Contact",
    editable: true,
    render: (franchise) => franchise.contact_email || franchise.contact_phone || "",
  },
  { key: "logo_url", label: "Logo URL", editable: true },
  { key: "location_map_url", label: "Map URL", editable: true },
  { key: "description", label: "Description", editable: true, inputType: "textarea", rows: 2 },
];

export default function FranchisesPage() {
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState("");
  const context = useMemo(() => ({ tournamentId: selectedTournament }), [selectedTournament]);

  const loadTournaments = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/tournaments`);
      const json = await res.json();
      const list = Array.isArray(json) ? json : (json.data || []);
      setTournaments(list);
      if (list.length && !selectedTournament) {
        setSelectedTournament(list[0].id);
      }
    } catch {
      setTournaments([]);
    }
  }, [selectedTournament]);

  useEffect(() => {
    loadTournaments();
  }, [loadTournaments]);

  return (
    <DirectoryPage
      title="Franchises"
      subtitle="Manage club/franchise details."
      addTitle="Add Franchise"
      listTitle="Franchise List"
      emptyMessage="No franchises yet."
      confirmDeleteMessage="Remove this franchise? This cannot be undone."
      fields={fields}
      columns={columns}
      sortItems={(a, b) => (a.name || "").localeCompare(b.name || "")}
      getInitialForm={() => ({ ...emptyForm })}
      buildEditData={(franchise) => ({
        tournament_id: franchise.tournament_id,
        name: franchise.name || "",
        logo_url: franchise.logo_url || "",
        manager_name: franchise.manager_name || "",
        manager_photo_url: franchise.manager_photo_url || "",
        description: franchise.description || "",
        contact_phone: franchise.contact_phone || "",
        location_map_url: franchise.location_map_url || "",
        contact_email: franchise.contact_email || "",
      })}
      validateCreate={(form) => {
        if (!selectedTournament) return "Select a tournament first.";
        if (!form.name.trim()) return "Franchise name is required.";
        return "";
      }}
      validateEdit={(form) => (!form.name.trim() ? "Franchise name is required." : "")}
      getListUrl={() =>
        adminUrl(`franchises?tournamentId=${encodeURIComponent(selectedTournament)}`)
      }
      getCreateRequest={(form) =>
        buildRequest(adminUrl("franchises"), "POST", {
          ...form,
          tournament_id: selectedTournament,
        })
      }
      getUpdateRequest={(franchise, form) =>
        buildRequest(
          adminUrl(
            `franchises/${franchise.id}?tournamentId=${encodeURIComponent(franchise.tournament_id)}`
          ),
          "PUT",
          {
            name: form.name,
            logo_url: form.logo_url,
            manager_name: form.manager_name,
            manager_photo_url: form.manager_photo_url,
            description: form.description,
            contact_phone: form.contact_phone,
            location_map_url: form.location_map_url,
            contact_email: form.contact_email,
          }
        )
      }
      getDeleteRequest={(franchise) =>
        buildRequest(
          adminUrl(
            `franchises/${franchise.id}?tournamentId=${encodeURIComponent(franchise.tournament_id)}`
          ),
          "DELETE"
        )
      }
      headerAddon={
        <select
          style={styles.select}
          value={selectedTournament}
          onChange={(e) => setSelectedTournament(e.target.value)}
          aria-label="Tournament"
        >
          {tournaments.map((tournament) => (
            <option key={tournament.id} value={tournament.id}>
              {tournament.name}
            </option>
          ))}
        </select>
      }
      reloadKey={selectedTournament}
      context={context}
    />
  );
}
