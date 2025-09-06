import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../api";

function DashboardSummary() {
  const { t } = useTranslation();
  const [counts, setCounts] = useState({ pending: 0, ongoing: 0, upcoming: 0 });
  const [error, setError] = useState("");

  useEffect(() => {
    api("/stats/loans")
      .then((data) => {
        const map = data.reduce((acc, { _id, count }) => {
          acc[_id] = count;
          return acc;
        }, {});
        setCounts({
          pending: map.pending || 0,
          ongoing: map.ongoing || 0,
          upcoming: map.upcoming || 0,
        });
      })
      .catch(() => setError(t("common.error")));
  }, [t]);

  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <div className="card-grid" style={{ marginBottom: "var(--spacing-xl)" }}>
      <div className="card">
        <div className="card-body">
          <h5 className="card-title h5">{t("dashboard.pending")}</h5>
          <p className="card-text">{counts.pending}</p>
        </div>
      </div>
      <div className="card">
        <div className="card-body">
          <h5 className="card-title h5">{t("dashboard.ongoing")}</h5>
          <p className="card-text">{counts.ongoing}</p>
        </div>
      </div>
      <div className="card">
        <div className="card-body">
          <h5 className="card-title h5">{t("dashboard.upcoming")}</h5>
          <p className="card-text">{counts.upcoming}</p>
        </div>
      </div>
    </div>
  );
}

export default DashboardSummary;
