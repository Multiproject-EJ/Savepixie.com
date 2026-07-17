import { Link, useParams } from "react-router-dom";

type LegalDocument = {
  eyebrow: string;
  title: string;
  introduction: string;
  sections: Array<{ title: string; paragraphs: string[] }>;
};

const privacyDocument: LegalDocument = {
  eyebrow: "Your data, in plain language",
  title: "Privacy Policy",
  introduction:
    "This closed-beta notice explains what SavePixie records, why it is needed, and the controls you have. It is written for clarity and still requires final legal review before a public launch.",
  sections: [
    {
      title: "What SavePixie collects",
      paragraphs: [
        "We collect your email address and authentication details, the profile name you choose, Savings Homes, goals and Pacts, saving commitments and entries, weekly plans, privacy choices, and support messages you send us.",
        "A Savings Home can include a bank or provider name, an account hint, and a balance you report. Do not enter a full account number, card number, bank password, or banking security code. SavePixie does not hold your savings or connect to your bank during the closed beta.",
        "Our hosting and authentication providers also process limited technical information needed to secure and operate the service, such as session, request, and error logs.",
      ],
    },
    {
      title: "Why it is used",
      paragraphs: [
        "We use account and saving data to provide the service you request, keep shared Pacts working, prevent misuse, respond to support, and improve reliability. If paid plans are enabled, Stripe processes payment details and SavePixie stores only the customer mapping and subscription status needed to provide access.",
        "We will ask separately before enabling optional analytics or marketing that requires consent. SavePixie does not sell your personal data.",
      ],
    },
    {
      title: "Sharing and storage",
      paragraphs: [
        "Supabase provides the database and authentication layer for the shared SavePixie and WalletHabit product suite. The production project is hosted in the EU. Website hosting and, when enabled, Stripe billing are separate service providers with access only for their operating purpose.",
        "In shared Pacts, other active members see only the progress allowed by your Pact privacy choice. They do not see your private Savings Home or individual saving entries.",
      ],
    },
    {
      title: "Retention and deletion",
      paragraphs: [
        "Core account data is kept while your account is active. You can export it from Settings and permanently delete the account in the app. Account deletion removes the authentication user and linked personal SavePixie records, but never affects money held at your bank. A shared Pact with active members is handed to its longest-standing remaining member; your membership and personal entries are removed.",
        "Deletion is paused if Stripe reports a subscription that is still active or unresolved, so an account cannot disappear while charges may continue. Billing records may need to be retained separately where tax, accounting, dispute, or fraud-prevention law requires it.",
      ],
    },
    {
      title: "Your choices and rights",
      paragraphs: [
        "You can access and correct key information in the app, download a portable copy, change Pact visibility, leave a shared Pact, or delete the account. Depending on where you live, you may also have rights to access, correct, erase, restrict, or object to processing and to complain to your data-protection authority.",
        "For a privacy question or rights request, email support@savepixie.com. The final public policy must add the legal operator name, address, and jurisdiction before launch.",
      ],
    },
    {
      title: "Age boundary",
      paragraphs: [
        "The first closed beta is intended for adults aged 18 or over. Child and family profiles will not be enabled until consent, safeguarding, and age-appropriate privacy requirements have been designed and reviewed.",
      ],
    },
  ],
};

const termsDocument: LegalDocument = {
  eyebrow: "The simple ground rules",
  title: "Terms of Use",
  introduction:
    "These terms describe the SavePixie closed beta. They are a product draft for review, not the final public customer contract.",
  sections: [
    {
      title: "What SavePixie is",
      paragraphs: [
        "SavePixie is a savings-habit and motivation tool. It helps you record goals, commitments, progress, and shared Pacts. It is not a bank, wallet, payment account, investment service, credit service, financial adviser, or money-transfer service.",
        "Amounts shown in SavePixie are records and promises. Your real savings must remain 1:1 in an account you control. SavePixie never takes custody of those funds.",
      ],
    },
    {
      title: "Your account",
      paragraphs: [
        "You must be at least 18 for the closed beta, provide accurate account information, keep your password private, and use the service lawfully. Tell support promptly if you believe your account has been accessed without permission.",
        "Pact invitations are private. Do not share an invitation outside the people you intend to include. Organisers control Pact status, while each member controls the privacy options made available to them.",
      ],
    },
    {
      title: "Saving information",
      paragraphs: [
        "Manual entries are not proof of a bank transfer or account balance. You remain responsible for checking your actual bank account and for every financial decision you make. Educational ideas in the app are general information, not personal financial advice.",
      ],
    },
    {
      title: "Paid features",
      paragraphs: [
        "Paid plans are not active during the initial closed beta. If SavePixie Pro is offered, the checkout will show the exact price, trial length, renewal timing, taxes, and cancellation terms before payment. The current product target is 29 kr per month after a clearly disclosed seven-day trial.",
        "Subscriptions will be managed through Stripe. You will be able to cancel from Billing before the next renewal. Refund and statutory withdrawal rights depend on the final seller identity, your location, and applicable consumer law; final reviewed terms must be published before payments are enabled.",
      ],
    },
    {
      title: "Availability and fair use",
      paragraphs: [
        "The beta may change and may occasionally be unavailable. We may limit abusive, automated, fraudulent, or unsafe use. We will take reasonable care with the service, but you should keep your own export if the records are important to you.",
      ],
    },
    {
      title: "Leaving SavePixie",
      paragraphs: [
        "You can stop using SavePixie at any time and delete your account in Settings. An active or unresolved subscription must be cancelled in Billing first so deletion cannot hide an ongoing charge. Account deletion never closes or changes your bank account.",
        "Questions can be sent to support@savepixie.com. The final terms must add the legal seller identity, address, governing law, complaints route, and legally reviewed liability language before public launch.",
      ],
    },
  ],
};

export function LegalPage() {
  const { document } = useParams();
  const content = document === "privacy" ? privacyDocument : termsDocument;

  return (
    <div className="legal-page">
      <header className="legal-hero">
        <span className="eyebrow">{content.eyebrow}</span>
        <h1>{content.title}</h1>
        <p>{content.introduction}</p>
        <div className="legal-draft-badge">Closed-beta draft · Updated 17 July 2026</div>
      </header>

      <nav className="legal-switcher" aria-label="Legal documents">
        <Link className={document !== "privacy" ? "active" : ""} to="/legal/terms">
          Terms
        </Link>
        <Link className={document === "privacy" ? "active" : ""} to="/legal/privacy">
          Privacy
        </Link>
      </nav>

      <article className="legal-document surface-card">
        {content.sections.map((section) => (
          <section key={section.title}>
            <h2>{section.title}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </section>
        ))}
      </article>

      <div className="legal-back-row">
        <Link className="button secondary" to="/">
          Back to SavePixie
        </Link>
        <a className="button secondary" href="mailto:support@savepixie.com">
          Contact support
        </a>
      </div>
    </div>
  );
}

export default LegalPage;
