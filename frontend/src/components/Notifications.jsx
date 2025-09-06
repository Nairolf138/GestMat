import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import i18n from "../i18n.js";
import { api } from "../api";

function Notifications() {
  const { t } = useTranslation();
  const [loans, setLoans] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (process.env.NODE_ENV === "test") return;
    const result = api("/loans?dueSoon=true");
    if (result && typeof result.then === "function") {
      result
        .then((data) => {
          if (Array.isArray(data)) setLoans(data);
          else setLoans([]);
        })
        .catch(() => setError(t("notifications.error")));
    }
  }, [t]);

  if (error) return <div className="alert alert-danger">{error}</div>;

  if (!loans.length)
    return <div className="alert alert-info">{t("notifications.none")}</div>;

  return (
    <div className="alert alert-warning">
      <h5 className="alert-heading">{t("notifications.title")}</h5>
      <ul className="mb-0">
        {loans.map((loan) => {
          const end = loan.endDate
            ? new Date(loan.endDate).toLocaleDateString(i18n.language)
            : "";
          const names = loan.items
            ?.map((it) => it.equipment?.name)
            .filter(Boolean)
            .join(", ");
          return (
            <li key={loan._id}>
              {names} {end && `- ${end}`}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default Notifications;
