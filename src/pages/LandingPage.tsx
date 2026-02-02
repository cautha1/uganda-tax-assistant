import { Link } from "react-router-dom";
import { useTranslation } from "@/hooks/useTranslation";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { Building2, CheckCircle2, FileText, Users, Shield, ArrowRight } from "lucide-react";

export default function LandingPage() {
  const { t } = useTranslation();

  const features = [
    { icon: FileText, title: t('landing.features.taxFormGeneration'), desc: t('landing.features.taxFormGenerationDesc') },
    { icon: Building2, title: t('landing.features.multiBusiness'), desc: t('landing.features.multiBusinessDesc') },
    { icon: Users, title: t('landing.features.accountantAccess'), desc: t('landing.features.accountantAccessDesc') },
    { icon: Shield, title: t('landing.features.auditTrail'), desc: t('landing.features.auditTrailDesc') },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="border-b border-border bg-card/80 backdrop-blur sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-lg">TaxAudit Uganda</span>
          </Link>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Button variant="ghost" asChild><Link to="/login">{t('nav.signIn')}</Link></Button>
            <Button asChild><Link to="/register">{t('nav.getStarted')}</Link></Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-hero py-24 lg:py-32">
        <div className="container relative z-10">
          <div className="max-w-2xl mx-auto text-center text-primary-foreground">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/20 text-accent text-sm font-medium mb-6">
              <Shield className="h-4 w-4" /> {t('landing.trustedBy')}
            </div>
            <h1 className="text-4xl lg:text-5xl font-display font-bold tracking-tight mb-6">
              {t('landing.heroTitle')}
            </h1>
            <p className="text-lg text-primary-foreground/80 mb-8">
              {t('landing.heroSubtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90" asChild>
                <Link to="/register">{t('landing.startFree')} <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button size="lg" variant="outline" className="border-primary-foreground/60 bg-primary-foreground/10 text-primary-foreground font-semibold hover:bg-primary-foreground/20" asChild>
                <Link to="/login">{t('nav.signIn')}</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <h2 className="text-2xl font-display font-bold text-center mb-12">{t('landing.featuresTitle')}</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <div key={i} className="card-elevated p-6 text-center">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <f.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container max-w-3xl text-center">
          <h2 className="text-3xl font-display font-bold mb-4">{t('landing.ctaTitle')}</h2>
          <p className="text-muted-foreground mb-8">{t('landing.ctaSubtitle')}</p>
          <Button size="lg" asChild><Link to="/register">{t('landing.createFreeAccount')}</Link></Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 bg-muted/30">
        <div className="container text-center text-sm text-muted-foreground">
          <p>{t('landing.footer')}</p>
        </div>
      </footer>
    </div>
  );
}
