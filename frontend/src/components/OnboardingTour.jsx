import React from "react";
import Joyride from "react-joyride";
import { useTranslation } from "react-i18next";

function OnboardingTour({ run, onClose }) {
  const { t } = useTranslation();
  const steps = [
    {
      target: ".tutorial-notifications",
      content: t("tour.notifications"),
    },
    {
      target: ".tutorial-search",
      content: t("tour.search"),
    },
    {
      target: ".tutorial-shortcuts",
      content: t("tour.shortcuts"),
    },
  ];

  return (
    <Joyride
      steps={steps}
      continuous
      showSkipButton
      run={run}
      locale={{
        back: t("tour.back"),
        close: t("tour.close"),
        last: t("tour.last"),
        next: t("tour.next"),
        skip: t("tour.skip"),
      }}
      callback={(data) => {
        const { status } = data;
        const finished = ["finished", "skipped"];
        if (finished.includes(status)) {
          localStorage.setItem("onboardingComplete", "true");
          onClose();
        }
      }}
    />
  );
}

export default OnboardingTour;
