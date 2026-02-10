import { Link } from "react-router-dom";
import { ArrowLeft, Building2 } from "lucide-react";
import { Footer } from "@/components/layout/Footer";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <nav className="border-b border-border bg-card/80 backdrop-blur sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-lg">TaxAudit Uganda</span>
          </Link>
          <Link
            to="/"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
        </div>
      </nav>

      <main className="flex-1 container max-w-3xl py-12 px-4">
        <h1 className="text-3xl font-display font-bold mb-8">Terms of Service</h1>

        <div className="prose prose-sm max-w-none space-y-6 text-foreground">
          <p className="text-muted-foreground">Last updated: February 10, 2026</p>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing or using SME Tax Aid ("the Platform"), operated by Cacai Solutions, you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you may not use the Platform.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">2. Description of Service</h2>
            <p className="text-muted-foreground leading-relaxed">
              SME Tax Aid is a tax compliance and audit management platform designed for small and medium-sized enterprises (SMEs) in Uganda. The Platform provides tools for tax form preparation, expense and income tracking, reconciliation reporting, and accountant collaboration.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">3. User Accounts</h2>
            <p className="text-muted-foreground leading-relaxed">
              You must provide accurate and complete information when creating an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must notify us immediately of any unauthorized use.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">4. Acceptable Use</h2>
            <p className="text-muted-foreground leading-relaxed">
              You agree not to use the Platform for any unlawful purpose, to upload false or misleading financial information, to attempt to gain unauthorized access to other accounts or systems, or to interfere with the proper functioning of the Platform.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">5. Data and Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your use of the Platform is also governed by our <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>. By using the Platform, you consent to the collection and use of your information as described therein.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">6. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed">
              All content, trademarks, and technology on the Platform are owned by Cacai Solutions or its licensors. You may not reproduce, distribute, or create derivative works without prior written consent.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">7. Disclaimer of Warranties</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Platform is provided "as is" and "as available" without warranties of any kind, either express or implied. We do not guarantee that the Platform will be uninterrupted, error-free, or free of harmful components. The Platform does not provide tax, legal, or financial advice.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">8. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              To the fullest extent permitted by law, Cacai Solutions shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or related to your use of the Platform.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">9. Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may suspend or terminate your access to the Platform at our sole discretion, without notice, for conduct that we believe violates these Terms or is harmful to other users or the Platform.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">10. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to update these Terms at any time. Changes will be posted on this page with an updated revision date. Continued use of the Platform after changes constitutes acceptance of the revised Terms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">11. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about these Terms, please contact us at{" "}
              <a href="mailto:info@cacaisolutions.tech" className="text-primary hover:underline">info@cacaisolutions.tech</a>.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
