/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: 'hsl(var(--destructive))',
        'destructive-foreground': 'hsl(var(--destructive-foreground))',
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        sidebar: {
          background: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
        lol: {
          gold: '#c89b3c',
          blue: '#5bc0de',
          'dark-blue': '#0a1428',
          gray: '#1e2328',
          'light-gray': '#3c3c41',
          brown: '#463714',
          cream: '#f0e6d2',
          muted: '#a09b8c',
          'panel-dark': '#1a1d23',
          'panel-mid': '#252930',
          'panel-light': '#353941',
          'border-gold': '#5a4a1f',
          'input-bg': '#0f1419',
        },
        success: '#28a745',
        danger: '#dc3545',
        warning: '#ffc107',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['Segoe UI', 'Tahoma', 'Geneva', 'Verdana', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-page': 'linear-gradient(135deg, #0a1428 0%, #1e2328 100%)',
        'gradient-panel': 'linear-gradient(145deg, #1a1d23 0%, #353941 100%)',
        'gradient-panel-hover': 'linear-gradient(145deg, #1e2328 0%, #2a2d35 100%)',
        'gradient-card': 'linear-gradient(145deg, #1a1d23 0%, #353941 100%)',
        'gradient-card-dark': 'linear-gradient(145deg, #1a1d23 0%, #252930 100%)',
        'gradient-gold': 'linear-gradient(145deg, #c89b3c 0%, #f0e6d2 100%)',
        'gradient-button': 'linear-gradient(145deg, #463714 0%, #5bc0de 100%)',
        'gradient-header': 'linear-gradient(145deg, #1e2328 0%, #3c3c41 100%)',
        'gradient-asset-card': 'linear-gradient(145deg, #3c3c41 0%, #1e2328 100%)',
      },
      boxShadow: {
        'gold': '0 4px 12px rgba(200, 155, 60, 0.3)',
        'gold-lg': '0 8px 24px rgba(200, 155, 60, 0.3), 0 0 20px rgba(200, 155, 60, 0.1)',
        'panel': '0 4px 16px rgba(0, 0, 0, 0.4)',
        'panel-hover': '0 8px 24px rgba(200, 155, 60, 0.2), 0 0 20px rgba(200, 155, 60, 0.05)',
        'auth-card': '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 40px rgba(200, 155, 60, 0.05)',
        'blue': '0 4px 12px rgba(91, 192, 222, 0.3)',
        'danger': '0 2px 8px rgba(220, 53, 69, 0.2)',
      },
      keyframes: {
        spin: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        fadeInDown: {
          from: { opacity: '0', transform: 'translateY(-30px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(30px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
      animation: {
        spin: 'spin 1s linear infinite',
        float: 'float 3s ease-in-out infinite',
        'fade-in-down': 'fadeInDown 0.8s ease-out',
        'fade-in-up': 'fadeInUp 0.8s ease-out',
        'fade-in': 'fadeIn 0.5s ease-out',
      },
    },
  },
  plugins: [],
};
