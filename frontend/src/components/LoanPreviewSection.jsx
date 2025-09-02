import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LoanSummaryItem from "../LoanSummaryItem.jsx";

function LoanPreviewSection({ title, loans, emptyMessage, previewCount, counterLabel }) {
  const { t } = useTranslation();

  return (
    <>
      <h2 className="h2">{title}</h2>
      <ul className="list-group" style={{ marginBottom: "var(--spacing-lg)" }}>
        {loans.slice(0, previewCount).map((l) => (
          <LoanSummaryItem key={l._id} loan={l} />
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
