import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useAuthStore } from '@/store/authStore';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';

export function Navigation() {
  const { t } = useTranslation();
  const location = useLocation();
  const { isAuthenticated, user } = useAuthStore();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { id: 'home', label: t('nav.home'), href: '/' },
    { id: 'services', label: t('nav.services'), href: '/#services' },
    { id: 'about', label: t('nav.about'), href: '/#about' },
    { id: 'consult', label: t('nav.consult'), href: '/consult' },
  ];

  const isActive = (href: string) => {
    if (href.startsWith('/#')) {
      return location.pathname === '/' && location.hash === href.substring(1);
    }
    return location.pathname === href;
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled
          ? 'bg-black/90 backdrop-blur-md border-b border-outline/10'
          : 'bg-transparent'
      }`}
    >
      <nav className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-xl md:text-2xl font-bold text-gold-gradient font-serif">
              {t('app.name')}
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.id}
                to={item.href}
                className={`text-sm font-medium transition-colors duration-300 ${
                  isActive(item.href)
                    ? 'text-gold'
                    : 'text-on-surface/70 hover:text-on-surface'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Right Side */}
          <div className="flex items-center space-x-4">
            <LanguageSwitcher />
            
            {isAuthenticated ? (
              <Link to="/profile">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-on-surface hover:text-gold hover:bg-on-surface/5"
                >
                  <span className="material-symbols-outlined">person</span>
                </Button>
              </Link>
            ) : (
              <Link to="/consult" className="hidden sm:block">
                <Button className="bg-gold text-black hover:bg-gold/90">
                  {t('nav.consult')}
                </Button>
              </Link>
            )}

            {/* Mobile Menu */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-on-surface hover:text-gold hover:bg-on-surface/5"
                >
                  <span className="material-symbols-outlined">menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="w-[300px] bg-black border-l border-outline/10"
              >
                <div className="flex flex-col space-y-6 mt-8">
                  {navItems.map((item) => (
                    <Link
                      key={item.id}
                      to={item.href}
                      onClick={() => setIsOpen(false)}
                      className={`text-lg font-medium transition-colors duration-300 ${
                        isActive(item.href)
                          ? 'text-gold'
                          : 'text-on-surface/70 hover:text-on-surface'
                      }`}
                    >
                      {item.label}
                    </Link>
                  ))}
                  
                  {!isAuthenticated && (
                    <Link to="/consult" onClick={() => setIsOpen(false)}>
                      <Button className="w-full bg-gold text-black hover:bg-gold/90">
                        {t('nav.consult')}
                      </Button>
                    </Link>
                  )}
                  
                  {isAuthenticated && (
                    <Link to="/profile" onClick={() => setIsOpen(false)}>
                      <Button
                        variant="outline"
                        className="w-full border-gold text-gold hover:bg-gold hover:text-black"
                      >
                        <span className="material-symbols-outlined mr-2">person</span>
                        {user?.name || t('nav.profile')}
                      </Button>
                    </Link>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>
    </header>
  );
}
