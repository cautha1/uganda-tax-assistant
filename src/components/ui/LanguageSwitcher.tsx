import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Language, SUPPORTED_LANGUAGES } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface LanguageSwitcherProps {
  variant?: "compact" | "full";
  className?: string;
}

export function LanguageSwitcher({ variant = "compact", className }: LanguageSwitcherProps) {
  const { language, setLanguage } = useLanguage();

  const handleLanguageChange = async (lang: Language) => {
    await setLanguage(lang);
  };

  const currentLang = SUPPORTED_LANGUAGES.find(l => l.code === language);

  if (variant === "compact") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn("gap-1.5 px-2 h-8", className)}
          >
            <Globe className="h-4 w-4" />
            <span className="uppercase font-medium text-xs">{language}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[120px]">
          {SUPPORTED_LANGUAGES.map((lang) => (
            <DropdownMenuItem
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className="flex items-center justify-between"
            >
              <span>{lang.nativeName}</span>
              {language === lang.code && <Check className="h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Full variant - for settings pages
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap gap-2">
        {SUPPORTED_LANGUAGES.map((lang) => (
          <Button
            key={lang.code}
            variant={language === lang.code ? "default" : "outline"}
            size="sm"
            onClick={() => handleLanguageChange(lang.code)}
            className="min-w-[100px]"
          >
            {lang.nativeName}
            {language === lang.code && <Check className="h-4 w-4 ml-2" />}
          </Button>
        ))}
      </div>
    </div>
  );
}
