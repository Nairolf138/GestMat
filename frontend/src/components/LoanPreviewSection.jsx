import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";

function LoanPreviewSection({ title, loans, emptyMessage, previewCount, counterLabel }) {
  const { t } = useTranslation();

  return (
    <>
      <h2 className="h2">{title}</h2>
      <ul className="list-group" style={{ marginBottom: "var(--spacing-lg)" }}>
        {loans.slice(0, previewCount).map((l) => (
          <li key={l._id} className="list-group-item">
            {l.status === "pending" ? (
              <>
                {l.borrower?.name} → {l.owner?.name} (
                {l.startDate
                  ? new Date(l.startDate).toLocaleDateString(i18n.language)
                  : ""}
                )
              </>
            ) : (
              <>
                {l.owner?.name} (
                {l.startDate
                  ? new Date(l.startDate).toLocaleDateString(i18n.language)
                  : ""}
                → {l.endDate
                  ? new Date(l.endDate).toLocaleDateString(i18n.language)
                  : ""}
                )
              </>
            )}
          </li>
        ))}
        {!loans.length && <li className="list-group-item">{emptyMessage}</li>}
      </ul>
      <p>
        {loans.length > previewCount && <span>{counterLabel} </span>}
        <Link to="/loans">{t("home.view_all")}</Link>
      </p>
    </>
  );
}

export default LoanPreviewSection;
