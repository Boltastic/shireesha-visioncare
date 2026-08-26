import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import PageMeta from "./components/PageMeta";
import AdminPage from "./pages/AdminPage";
import BookPage from "./pages/BookPage";
import { AboutPage, ContactPage, HomePage, ServicesPage } from "./pages/PublicPages";

function Router() {
  return <Switch><Route path="/" component={HomePage} /><Route path="/services" component={ServicesPage} /><Route path="/about" component={AboutPage} /><Route path="/contact" component={ContactPage} /><Route path="/book" component={BookPage} /><Route path="/admin/:rest*" component={AdminPage} /><Route path="/admin" component={AdminPage} /><Route path="/404" component={NotFound} /><Route component={NotFound} /></Switch>;
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><LanguageProvider><PageMeta /><TooltipProvider><NotificationProvider><Router /></NotificationProvider></TooltipProvider></LanguageProvider></ThemeProvider></ErrorBoundary>;
}
