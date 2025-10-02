import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

const resources = {
  en: {
    translation: {
      title: 'Welcome back to Tigabytes Datapad',
      subtitle: 'Manage customer intelligence with a secure, multilingual workspace.',
      trustedBy: 'Trusted by teams across Latin America.',
      emailLabel: 'Email',
      emailPlaceholder: 'you@company.com',
      passwordLabel: 'Password',
      passwordPlaceholder: 'Enter your password',
      rememberMe: 'Remember me',
      sessionPersist: 'Keep this device signed in',
      forgotPassword: 'Forgot your password?',
      signIn: 'Sign in',
      signingIn: 'Signing in...',
      signOut: 'Sign out',
      signingOut: 'Signing out...',
      or: 'or',
      googleLogin: 'Login with Google',
      authError: 'We could not verify your credentials. Please try again.',
      authSuccess: 'Authenticated successfully. Preparing your workspace...',
      missingSupabaseConfig: 'Supabase environment variables are not set. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to continue.',
      languageLabel: 'Language',
      loading: {
        portal: 'Loading portal...',
        access: 'Validating access...',
        generic: 'Loading...'
      },
      admin: {
        accessDenied: 'You do not have access to the portal yet.',
        userRole: 'Portal Admin',
        title: 'Portal Administration',
        subtitle: 'Manage users, customers, and portal settings.',
        nav: {
          label: 'Portal primary navigation',
          admin: 'Admin',
          licenses: 'Licenses',
          support: 'GWS Support',
          billing: 'Billing',
          notifications: 'View notifications'
        },
        cards: {
          ariaLabel: 'Key portal statistics',
          portalUsers: {
            label: 'Total Portal Users',
            helper: 'Current portal accounts'
          },
          customers: {
            label: 'Total Customers',
            helper: 'Organizations managed here'
          },
          sessions: {
            label: 'Active Sessions',
            helper: 'Active right now'
          },
          approvals: {
            label: 'Pending Approvals',
            helper: 'Requires attention',
            helperResolved: 'All approvals are up to date'
          }
        },
        actions: {
          addUser: 'Add New User',
          export: 'Export Data',
          manageRoles: 'Manage Roles',
          createRole: 'Create Role'
        },
        table: {
          title: 'User Management',
          subtitle: 'Manage users by name, email, or role.',
          searchPlaceholder: 'Search users by name, email, or role...',
          roleFilterLabel: 'Filter by role',
          roleFilterAll: 'All Roles',
          filterLabel: 'Open filters',
          headers: {
            user: 'User',
            role: 'Role',
            customer: 'Customer',
            lastLogin: 'Last Login',
            status: 'Status',
            actions: 'Actions'
          },
          roles: {
            customerAdmin: 'Customer Admin',
            customerUser: 'Customer User',
            supportAgent: 'Support Agent',
            portalAdmin: 'Portal Admin'
          },
          actions: {
            customerAdmin: 'Customer Admin',
            customerUser: 'Customer User',
            supportAgent: 'Support Agent',
            portalAdmin: 'Portal Admin'
          },
          lastLogin: {
            hours_one: '{{count}} hour ago',
            hours_other: '{{count}} hours ago',
            days_one: '{{count}} day ago',
            days_other: '{{count}} days ago',
            minutes_one: '{{count}} minute ago',
            minutes_other: '{{count}} minutes ago'
          },
          status: {
            active: 'Active',
            inactive: 'Inactive'
          },
          openCustomer: 'Open customer profile',
          removeUser: 'Remove user',
          pagination: {
            summary: 'Showing {{range}} of {{total}} users',
            prev: 'Previous',
            next: 'Next'
          }
        }
      }
    }
  },
  'pt-BR': {
    translation: {
      title: 'Bem-vindo de volta ao Tigabytes Datapad',
      subtitle: 'Gerencie a inteligência de clientes em um ambiente seguro e multilíngue.',
      trustedBy: 'Confiado por equipes em toda a América Latina.',
      emailLabel: 'E-mail',
      emailPlaceholder: 'você@empresa.com',
      passwordLabel: 'Senha',
      passwordPlaceholder: 'Digite sua senha',
      rememberMe: 'Continuar conectado',
      sessionPersist: 'Manter este dispositivo conectado',
      forgotPassword: 'Esqueceu sua senha?',
      signIn: 'Entrar',
      signingIn: 'Entrando...',
      signOut: 'Sair',
      signingOut: 'Saindo...',
      or: 'ou',
      googleLogin: 'Entrar com Google',
      authError: 'Não foi possível validar suas credenciais. Tente novamente.',
      authSuccess: 'Autenticação realizada. Preparando seu workspace...',
      missingSupabaseConfig: 'Variáveis do Supabase não configuradas. Adicione VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.',
      languageLabel: 'Idioma',
      loading: {
        portal: 'Carregando portal...',
        access: 'Validando acesso...',
        generic: 'Carregando...'
      },
      admin: {
        accessDenied: 'Você ainda não tem acesso ao portal.',
        userRole: 'Administrador do Portal',
        title: 'Administração do Portal',
        subtitle: 'Gerencie usuários, clientes e configurações do portal.',
        nav: {
          label: 'Navegação principal do portal',
          admin: 'Admin',
          licenses: 'Licenças',
          support: 'Suporte GWS',
          billing: 'Faturamento',
          notifications: 'Ver notificações'
        },
        cards: {
          ariaLabel: 'Indicadores principais do portal',
          portalUsers: {
            label: 'Usuários do Portal',
            helper: 'Contas atuais no portal'
          },
          customers: {
            label: 'Clientes Totais',
            helper: 'Clientes totais registrados'
          },
          sessions: {
            label: 'Sessões Ativas',
            helper: 'Sessões ativas agora'
          },
          approvals: {
            label: 'Aprovações Pendentes',
            helper: 'Requer atenção',
            helperResolved: 'Nenhuma aprovação pendente no momento'
          }
        },
        actions: {
          addUser: 'Adicionar Usuário',
          export: 'Exportar Dados',
          manageRoles: 'Gerenciar Papéis',
          createRole: 'Criar Papel'
        },
        table: {
          title: 'Gestão de Usuários',
          subtitle: 'Gerencie usuários por nome, e-mail ou papel.',
          searchPlaceholder: 'Busque usuários por nome, e-mail ou papel...',
          roleFilterLabel: 'Filtrar por papel',
          roleFilterAll: 'Todos os papéis',
          filterLabel: 'Abrir filtros',
          headers: {
            user: 'Usuário',
            role: 'Papel',
            customer: 'Cliente',
            lastLogin: 'Último acesso',
            status: 'Status',
            actions: 'Ações'
          },
          roles: {
            customerAdmin: 'Administrador do Cliente',
            customerUser: 'Usuário do Cliente',
            supportAgent: 'Agente de Suporte',
            portalAdmin: 'Administrador do Portal'
          },
          actions: {
            customerAdmin: 'Administrador do Cliente',
            customerUser: 'Usuário do Cliente',
            supportAgent: 'Agente de Suporte',
            portalAdmin: 'Administrador do Portal'
          },
          lastLogin: {
            hours_one: 'há {{count}} hora',
            hours_other: 'há {{count}} horas',
            days_one: 'há {{count}} dia',
            days_other: 'há {{count}} dias',
            minutes_one: 'há {{count}} minuto',
            minutes_other: 'há {{count}} minutos'
          },
          status: {
            active: 'Ativo',
            inactive: 'Inativo'
          },
          openCustomer: 'Abrir perfil do cliente',
          removeUser: 'Remover usuário',
          pagination: {
            summary: 'Exibindo {{range}} de {{total}} usuários',
            prev: 'Anterior',
            next: 'Próximo'
          }
        }
      }
    }
  },
  es: {
    translation: {
      title: 'Bienvenido de nuevo a Tigabytes Datapad',
      subtitle: 'Gestiona la inteligencia de clientes en un entorno seguro y multilingüe.',
      trustedBy: 'Con la confianza de equipos en toda Latinoamérica.',
      emailLabel: 'Correo electrónico',
      emailPlaceholder: 'tu@empresa.com',
      passwordLabel: 'Contraseña',
      passwordPlaceholder: 'Ingresa tu contraseña',
      rememberMe: 'Mantener sesión iniciada',
      sessionPersist: 'Mantener esta sesión en el dispositivo',
      forgotPassword: '¿Olvidaste tu contraseña?',
      signIn: 'Iniciar sesión',
      signingIn: 'Iniciando...',
      signOut: 'Cerrar sesión',
      signingOut: 'Cerrando sesión...',
      or: 'o',
      googleLogin: 'Iniciar sesión con Google',
      authError: 'No pudimos verificar tus credenciales. Inténtalo de nuevo.',
      authSuccess: 'Autenticado correctamente. Preparando tu espacio de trabajo...',
      missingSupabaseConfig: 'Configura las variables de entorno de Supabase: VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.',
      languageLabel: 'Idioma',
      loading: {
        portal: 'Cargando portal...',
        access: 'Validando acceso...',
        generic: 'Cargando...'
      },
      admin: {
        accessDenied: 'Aún no tienes acceso al portal.',
        userRole: 'Administrador del Portal',
        title: 'Administración del Portal',
        subtitle: 'Gestiona usuarios, clientes y configuraciones del portal.',
        nav: {
          label: 'Navegación principal del portal',
          admin: 'Admin',
          licenses: 'Licencias',
          support: 'Soporte GWS',
          billing: 'Facturación',
          notifications: 'Ver notificaciones'
        },
        cards: {
          ariaLabel: 'Indicadores clave del portal',
          portalUsers: {
            label: 'Usuarios del Portal',
            helper: 'Cuentas actuales en el portal'
          },
          customers: {
            label: 'Clientes Totales',
            helper: 'Clientes totales registrados'
          },
          sessions: {
            label: 'Sesiones Activas',
            helper: 'Sesiones activas ahora'
          },
          approvals: {
            label: 'Aprobaciones Pendientes',
            helper: 'Requiere atención',
            helperResolved: 'Sin aprobaciones pendientes por ahora'
          }
        },
        actions: {
          addUser: 'Agregar Usuario',
          export: 'Exportar Datos',
          manageRoles: 'Gestionar Roles',
          createRole: 'Crear Rol'
        },
        table: {
          title: 'Gestión de Usuarios',
          subtitle: 'Administra usuarios por nombre, correo o rol.',
          searchPlaceholder: 'Busca usuarios por nombre, correo o rol...',
          roleFilterLabel: 'Filtrar por rol',
          roleFilterAll: 'Todos los roles',
          filterLabel: 'Abrir filtros',
          headers: {
            user: 'Usuario',
            role: 'Rol',
            customer: 'Cliente',
            lastLogin: 'Último acceso',
            status: 'Estado',
            actions: 'Acciones'
          },
          roles: {
            customerAdmin: 'Administrador del Cliente',
            customerUser: 'Usuario del Cliente',
            supportAgent: 'Agente de Soporte',
            portalAdmin: 'Administrador del Portal'
          },
          actions: {
            customerAdmin: 'Administrador del Cliente',
            customerUser: 'Usuario del Cliente',
            supportAgent: 'Agente de Soporte',
            portalAdmin: 'Administrador del Portal'
          },
          lastLogin: {
            hours_one: 'hace {{count}} hora',
            hours_other: 'hace {{count}} horas',
            days_one: 'hace {{count}} día',
            days_other: 'hace {{count}} días',
            minutes_one: 'hace {{count}} minuto',
            minutes_other: 'hace {{count}} minutos'
          },
          status: {
            active: 'Activo',
            inactive: 'Inactivo'
          },
          openCustomer: 'Abrir perfil del cliente',
          removeUser: 'Eliminar usuario',
          pagination: {
            summary: 'Mostrando {{range}} de {{total}} usuarios',
            prev: 'Anterior',
            next: 'Siguiente'
          }
        }
      }
    }
  }
} as const

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: Object.keys(resources),
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['querystring', 'localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  })

export default i18n
