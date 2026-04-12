import type { Metadata } from "next";
import LegalPageShell from "@/components/marketing/LegalPageShell";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Roost collects, uses, stores, and protects information for households using the app.",
};

const sections = [
  {
    id: "information-we-collect",
    title: "Information we collect",
    body: [
      "We collect the information you provide when you create an account, join a household, invite other members, subscribe to paid features, contact support, or use features such as chores, grocery lists, shared expenses, reminders, calendar events, notes, and rewards.",
      "Depending on how you use Roost, this can include your name, email address, profile details, household name, member roles, task activity, grocery items, expense data, receipt uploads, reminder content, notes, subscription records, and other information you intentionally add to the service. We also collect basic technical and diagnostic information such as browser type, device characteristics, IP-derived region, and usage logs needed to keep the service secure and working properly.",
    ],
  },
  {
    id: "how-we-use-information",
    title: "How we use information",
    body: [
      "We use your information to operate Roost, authenticate you, sync household data across members, process subscriptions, improve reliability, prevent abuse, respond to support requests, and communicate important service or billing updates.",
      "We may also use aggregated or de-identified usage information to understand how people use Roost and to improve product decisions, performance, onboarding, and feature design.",
    ],
  },
  {
    id: "household-data",
    title: "How household data works",
    body: [
      "Roost is designed for shared household coordination. That means information entered into a household workspace may be visible to other members of that household based on the role and feature being used. For example, chores, shared expenses, grocery lists, reminders, and calendar entries are intended to be collaborative.",
      "If you invite someone into your household, you are responsible for understanding that they may be able to view or update household content depending on their permissions. If you no longer want someone to access household data, you should remove them from the household promptly.",
    ],
  },
  {
    id: "cookies-and-analytics",
    title: "Cookies, sessions, and analytics",
    body: [
      "Roost may use cookies, local storage, similar browser technologies, and server-side session tools to keep you signed in, remember preferences, secure the app, and understand how the service is performing.",
      "We may also use analytics or error-monitoring tools to understand product usage, diagnose issues, and improve reliability. Where required by law, we will provide appropriate disclosures or choices relating to those technologies.",
    ],
  },
  {
    id: "payments-and-subscriptions",
    title: "Payments and subscriptions",
    body: [
      "If you subscribe to a paid Roost plan, payment processing is handled by third-party payment providers. Roost does not store your full payment card number. We may receive billing status, subscription dates, plan details, and limited payment metadata needed to manage your subscription.",
      "Subscription and billing information is used to activate paid features, manage renewals, prevent fraud, and handle refunds or account support issues where applicable.",
    ],
  },
  {
    id: "sharing-information",
    title: "When we share information",
    body: [
      "We do not sell your personal information. We may share information with service providers that help us operate the app, such as hosting, authentication, analytics, email delivery, payment processing, customer support, and infrastructure vendors, but only to the extent needed for them to perform services on our behalf.",
      "We may also disclose information if required by law, to protect the safety or rights of Roost, our users, or others, or in connection with a merger, acquisition, financing, or sale of all or part of our business.",
    ],
  },
  {
    id: "retention-and-security",
    title: "Data retention and security",
    body: [
      "We retain information for as long as needed to provide the service, comply with legal obligations, resolve disputes, enforce agreements, and maintain security and backup processes. Retention periods may vary depending on the type of data and whether an account or household is still active.",
      "We use reasonable administrative, technical, and organizational safeguards to protect information, but no system can be guaranteed to be completely secure. You are responsible for keeping your password, login methods, and household invite access secure.",
    ],
  },
  {
    id: "international-transfers",
    title: "International transfers",
    body: [
      "Roost and its service providers may process or store information in jurisdictions other than your home country. Where that happens, we take reasonable steps intended to ensure information remains protected in line with this policy and applicable law.",
      "By using the service, you understand that your information may be transferred to and processed in places where privacy laws may differ from those in your jurisdiction.",
    ],
  },
  {
    id: "your-rights-and-choices",
    title: "Your rights and choices",
    body: [
      "You can access and update certain account information inside the app. You can also remove household members, change household settings, or close your account subject to any operational or legal retention requirements.",
      "If you need help with privacy requests, data access, correction, or deletion, you can contact us using the support details provided by Roost. We may need to verify your identity before completing sensitive requests.",
    ],
  },
  {
    id: "children-and-updates",
    title: "Children and policy updates",
    body: [
      "Roost may allow household organizers to create child profiles or limited-access household accounts. Adults responsible for those accounts are expected to manage them appropriately and only provide information they are authorized to share.",
      "We may update this Privacy Policy from time to time. If we make material changes, we may update the date on this page and, when appropriate, provide additional notice inside the app or by email.",
    ],
  },
  {
    id: "contact",
    title: "Contact",
    body: [
      "If you have a privacy question, request, or concern, please contact Roost using the support channel made available inside the app or through the contact information provided on the Roost website or billing communications.",
      "When you contact us about a privacy request, we may ask for enough information to verify your identity and confirm the household or account involved before taking action.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <LegalPageShell
      title="Privacy Policy"
      intro="This policy explains what information Roost collects, how we use it, and how shared household data works inside the app."
      lastUpdated="April 11, 2026"
      sections={sections}
      summaryItems={[
        "Account data",
        "Shared household content",
        "Payments",
        "Cookies and analytics",
        "Retention and rights",
      ]}
    />
  );
}
