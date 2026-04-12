import type { Metadata } from "next";
import LegalPageShell from "@/components/marketing/LegalPageShell";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms that apply when you access or use the Roost app and related services.",
};

const sections = [
  {
    id: "using-roost",
    title: "Using Roost",
    body: [
      "By accessing or using Roost, you agree to these Terms of Service and any additional policies or notices that apply to specific features. If you do not agree, you should not use the service.",
      "You must provide accurate account information, keep your login credentials secure, and use Roost only in ways that comply with applicable law and these terms.",
    ],
  },
  {
    id: "accounts-and-households",
    title: "Accounts and households",
    body: [
      "You are responsible for activity that occurs under your account and for managing who you invite into your household. Household organizers are responsible for setting appropriate roles and permissions for other members, including child or limited-access accounts.",
      "You may not impersonate another person, access another user's account without permission, or interfere with the normal operation of shared household spaces.",
    ],
  },
  {
    id: "acceptable-use",
    title: "Acceptable use",
    body: [
      "You agree not to misuse Roost. That includes attempting to reverse engineer the service, scrape or harvest data at scale, upload malicious code, bypass access controls, spam other users, interfere with payments, or use the app to violate anyone's rights.",
      "We may suspend or terminate accounts or households that create security risks, violate these terms, or use the service in abusive, fraudulent, or unlawful ways.",
    ],
  },
  {
    id: "user-content",
    title: "User content",
    body: [
      "You keep ownership of the content you submit to Roost, such as tasks, notes, reminders, receipts, and other household information. However, you grant Roost the rights needed to host, process, display, copy, and transmit that content solely for the purpose of operating and improving the service.",
      "You are responsible for the content you submit and for making sure you have the rights and permissions needed to share it, especially when it involves other household members or third parties.",
    ],
  },
  {
    id: "paid-plans-and-billing",
    title: "Paid plans and billing",
    body: [
      "Some Roost features may require a paid subscription. If you purchase a paid plan, you agree to the pricing, billing cycle, renewal terms, and plan details presented at the time of purchase.",
      "Unless otherwise stated, subscriptions renew automatically until canceled. You are responsible for any taxes, fees, chargebacks, failed payments, or unpaid amounts associated with your use of paid features.",
    ],
  },
  {
    id: "availability-and-changes",
    title: "Availability and changes",
    body: [
      "We may update, improve, remove, or limit features at any time. We do not guarantee that Roost will always be available, uninterrupted, or error-free, though we work to keep it reliable and secure.",
      "We may also modify these terms from time to time. Continued use of Roost after updated terms take effect means you accept the revised terms.",
    ],
  },
  {
    id: "intellectual-property",
    title: "Intellectual property",
    body: [
      "Roost, including its software, branding, design, and service materials, is protected by intellectual property laws. Except for the limited rights needed to use the service in accordance with these terms, no rights in Roost are transferred to you.",
      "You may not copy, modify, distribute, sell, license, or create derivative works from the service except where applicable law clearly permits it or we expressly allow it in writing.",
    ],
  },
  {
    id: "disclaimers-and-liability",
    title: "Disclaimers and limitation of liability",
    body: [
      "Roost is provided on an as-is and as-available basis to the fullest extent permitted by law. We do not guarantee that the service will meet every expectation or that data will never be lost, delayed, or unavailable.",
      "To the fullest extent permitted by law, Roost and its affiliates will not be liable for indirect, incidental, special, consequential, exemplary, or punitive damages, or for any loss of profits, data, goodwill, or business interruption arising from or related to your use of the service.",
    ],
  },
  {
    id: "governing-law-and-disputes",
    title: "Governing law and disputes",
    body: [
      "These terms are governed by the laws that apply to Roost's operating entity, without regard to conflict-of-law principles, except where applicable consumer protection law requires otherwise.",
      "If a dispute arises, we encourage you to contact Roost first so we can try to resolve the issue informally before either side escalates the matter further.",
    ],
  },
  {
    id: "termination",
    title: "Termination",
    body: [
      "You may stop using Roost at any time. We may suspend or terminate access if necessary to protect the service, comply with legal obligations, address nonpayment, or respond to violations of these terms.",
      "Sections that by their nature should survive termination, including provisions about payments, ownership, disclaimers, limitations of liability, and dispute-related terms, will survive termination.",
    ],
  },
  {
    id: "contact",
    title: "Contact",
    body: [
      "If you have questions about these Terms of Service, please use the support channel made available in the app or contact Roost through the information provided on the website or billing communications.",
      "We may send you notices relating to the service, these terms, billing matters, or account issues using the email address associated with your account or through in-app notices where appropriate.",
    ],
  },
];

export default function TermsPage() {
  return (
    <LegalPageShell
      title="Terms of Service"
      intro="These terms govern access to Roost and explain the responsibilities that come with using shared household tools, accounts, and paid features."
      lastUpdated="April 11, 2026"
      sections={sections}
      summaryItems={[
        "Accounts and households",
        "Acceptable use",
        "Billing",
        "Ownership",
        "Liability and disputes",
      ]}
    />
  );
}
