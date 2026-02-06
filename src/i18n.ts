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
          dashboard: 'Dashboard',
          analytics: 'Analytics',
          integrations: 'Integrations',
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
          createRole: 'Create Role',
          signOut: 'Sign out',
          signingOut: 'Signing out...',
          dismissNotification: 'Dismiss notification'
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
            updateRole: 'Update Role',
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
          customerLinkTitle: 'Link {{name}} to a customer',
          customerLinkSubtitle: 'Select which customer should be associated with this user.',
          customerLinkSelect: 'Customer',
          customerLinkSelectPlaceholder: 'Search or type a customer',
          customerLinkConfirm: 'Link customer',
          customerLinkSubmitting: 'Linking...',
          customerLinkCancel: 'Cancel',
          customerLinkClose: 'Close dialog',
          customerLinkLoading: 'Loading available customers...',
          customerLinkTrigger: 'Link selected customer',
          openCustomerList: 'Show customer options',
          closeCustomerList: 'Hide customer options',
          customerLinkNoneOption: 'No customer',
          customerLinkNoResults: 'No customers match your search.',
          customerLinkEmptyForUser: 'No customer mappings available for {{email}}.',
          customerLinkMissingSupabase: 'Supabase client is not configured. Linking is unavailable.',
          customerLinkMissingSelection: 'Select a customer to continue.',
          customerLinkSubmitError: 'Unable to link the user to the selected customer. Try again later.',
          customerLinkLoadError: 'Unable to load customer mappings. Please try again later.',
          customerLinkSuccess: 'Linked to {{customer}}.',
          customerLinkCleared: 'Customer link removed.',
          removeUser: 'Remove user',
          roleSelectLabel: 'Role',
          roleSelectAria: 'Change role for {{name}}',
          roleSelectPlaceholder: 'Select a role',
          openRoleList: 'Show role options',
          closeRoleList: 'Hide role options',
          roleSelectNoResults: 'No roles match your search.',
          roleUpdateSubmitting: 'Updating role...',
          roleUpdateSuccess: 'Role updated to {{role}}.',
          roleUpdateSubmitError: 'Unable to update the role. Try again later.',
          roleUpdateMissingSupabase: 'Supabase client is not configured. Role update unavailable.',
          roleUpdateMissingUid: 'Selected user is missing a UID.',
          removeDialog: {
            title: 'Remove {{name}}?',
            description: 'This action permanently removes the user from the portal. Continue?',
            confirm: 'Yes, remove user',
            cancel: 'Cancel',
            submitting: 'Removing...',
            error: 'Unable to remove this user right now. Try again later.',
            missingSupabase: 'Supabase client is not configured. Removal unavailable.',
            missingUid: 'User identifier is missing. Removal unavailable.',
            close: 'Close dialog'
          },
          loading: 'Loading users...',
          empty: 'No users found for the current filters.',
          error: 'Unable to load users. Please try again.',
          pagination: {
            summary: 'Showing {{range}} of {{total}} users',
            prev: 'Previous',
            next: 'Next'
          }
        },
        licenseRequests: {
          navLabel: 'License Requests',
          eyebrow: 'Partner Operations',
          title: 'License Requests Management',
          subtitle: 'Review and approve customer license requests.',
          pendingReviews: '{{count}} Pending Reviews',
          export: 'Export Report',
          filters: {
            title: 'Filters',
            clearAll: 'Clear All',
            statusLabel: 'Status',
            priorityLabel: 'Priority',
            licenseTypeLabel: 'License type',
            startDateLabel: 'From date',
            endDateLabel: 'To date',
            customerLabel: 'Customer',
            statusAll: 'All statuses',
            priorityAll: 'All priorities',
            typeAll: 'All types',
            datePlaceholder: 'Select date',
            searchPlaceholder: 'Search customer...'
          },
          licenseTypes: {
            starter: 'Business Starter',
            business: 'Business',
            enterprise: 'Enterprise'
          },
          table: {
            title: 'License Requests',
            totalLabel: '{{count}} total requests',
            refresh: 'Refresh list',
            headers: {
              request: 'Request',
              customer: 'Customer',
              details: 'License details',
              priority: 'Priority',
              status: 'Status',
              submitted: 'Submitted',
              actions: 'Actions'
            },
            seatsLabel: '{{count}} licenses',
            pricePerMonth: '{{value}}/month',
            approve: 'Approve',
            reject: 'Reject',
            view: 'View request details',
            empty: 'No requests match your filters.'
          },
          statuses: {
            pendingReview: 'Pending Review',
            evaluation: 'Under Evaluation',
            approved: 'Approved',
            rejected: 'Rejected'
          },
          priorities: {
            high: 'High',
            medium: 'Medium',
            low: 'Low'
          },
          actions: {
            refreshSuccess: 'Latest data loaded.',
            exported: 'Report exported successfully.',
            approved: 'Request {{code}} approved.',
            rejected: 'Request {{code}} rejected.'
          }
        },
      },
      customer: {
        nav: {
          label: 'Customer navigation',
          overview: 'Overview',
          licenses: 'Licenses',
          support: 'Support',
          notifications: 'View alerts and notifications'
        },
        hero: {
          greeting: 'Welcome back, {{name}}',
          subtitle: 'All your Google Workspace information in one place,',
          lastLogin: 'Last login: {{value}}',
          accountStatus: 'Account status: {{status}}',
          status: {
            active: 'Active'
          },
          companyLabel: 'Company:',
          companyAll: 'All customers'
        },
        actions: {
          refresh: 'Refresh data',
          retry: 'Retry'
        },
        error: {
          title: 'We couldn\'t load your dashboard.'
        },
        errors: {
          missingSupabase: 'Supabase client is not configured.',
          noCompanyMappings: 'No company mappings are linked to your account.',
          noLicensingData: 'No licensing data was returned for the linked companies.',
          generic: 'Unable to load your customer data right now.'
        },
        stats: {
          committed: {
            label: 'Committed seats',
            helper: 'Across {{value}} active entitlements'
          },
          active: {
            label: 'Assigned licenses',
            helperGain: '+{{value}} this month',
            helperFlat: 'No new licenses this month'
          },
          available: {
            label: 'Available licences',
            helper: 'Sum of unused seats across all entitlements'
          },
          utilization: {
            label: 'Utilization',
            helper: '{{value}} seats still available'
          }
        },
        panels: {
          licenses: {
            title: 'License overview',
            description: 'Track adoption by product and plan.',
            empty: 'No entitlements found for your account.'
          },
          alerts: {
            title: 'Alerts & renewals',
            description: 'Stay ahead of contract and usage milestones.',
            empty: 'No pending alerts. Your services are running smoothly.'
          },
          quickActions: {
            title: 'Quick actions',
            description: 'Jump into the tasks you manage most often.'
          }
        },
        licenses: {
          table: {
            total: 'Total',
            assigned: 'Assigned',
            available: 'Available'
          },
          buy: 'Buy Licenses',
          priceCondition: {
            byResources: 'Price based on resource usage',
            byLicenses: 'Price per license'
          },
          pricePerSeat: '{{value}} per seat'
        },
        status: {
          active: 'Active',
          suspended: 'Suspended',
          pending: 'Pending'
        },
        alerts: {
          suspension: {
            title: '{{product}} status',
            description: '{{state}} — check account {{company}}'
          },
          renewal: {
            title: '{{product}}',
            description: '{{relative}} • {{date}}',
            total: '{{value}} licenses'
          },
          utilization: {
            title: '{{product}} usage',
            description: '{{percent}} utilized • {{assigned}} assigned'
          }
        },
        dates: {
          dateUnavailable: 'Date unavailable',
          expired: 'Expired {{days}}d ago',
          dueToday: 'Due today',
          dueTomorrow: 'Due tomorrow',
          dueIn: 'Due in {{days}}d'
        },
        quickActions: {
          requestLicenses: {
            label: 'Request More Licenses',
            description: 'Start an order for additional seats.'
          },
          supportTicket: {
            label: 'Create Support Ticket',
            description: 'Flag product or billing issues.'
          },
          downloadReport: {
            label: 'Download Usage Report',
            description: 'Export recent utilization details.'
          }
        },
        footer: {
          rights: '© {{year}} Tigabytes. All rights reserved.',
          company: 'Company',
          contact: 'Contact support',
          terms: 'Terms of service',
          aria: 'Helpful links'
        },
        licenseRequest: {
          header: {
            title: 'License Request Details',
            description:
              'Please provide the details for your license request. Our team will review and process your request within one business day.'
          },
          alerts: {
            success: 'Your request has been recorded. Our team will reach out shortly.',
            missingSelection: 'Select a license from the overview before completing this form.'
          },
          errors: {
            licenseRequired: 'Please select a license before submitting your request.',
            quantityInvalid: 'Please enter a whole number greater than zero for the quantity.',
            supabaseUnavailable: 'Supabase client is not configured.',
            companyRequired: 'We could not determine the company linked to this request.',
            entitlementRequired: 'We could not determine the entitlement linked to this request.',
            submissionFailed: 'Unable to record your request right now. Please try again.'
          },
          fields: {
            licenseType: {
              label: 'License Type',
              placeholder: 'Select a license from the previous page'
            },
            quantity: {
              label: 'Number of Licenses',
              placeholder: 'Enter quantity'
            },
            department: {
              label: 'Department / Team',
              placeholder: 'Enter department or team name'
            },
            justification: {
              label: 'Business Justification',
              placeholder: 'Please explain the business need for additional licenses...'
            }
          },
          actions: {
            cancel: 'Cancel',
            submit: 'Submit Request',
            submitting: 'Submitting…'
          },
          summary: {
            title: 'Customer License Summary',
            description: 'High-level view of your current Google Workspace allocation.',
            items: {
              total: 'Total',
              assigned: 'Assigned',
              available: 'Available'
            },
            utilization: {
              label: 'Utilization rate'
            }
          },
          selection: {
            title: 'Current Selection',
            labels: {
              license: 'License',
              company: 'Company',
              plan: 'Plan',
              pricePerSeat: 'Price per seat',
              pricingNotes: 'Pricing notes',
              requestedSeats: 'Requested seats',
              estimatedMonthly: 'Estimated monthly'
            },
            empty: {
              license: 'Choose a license'
            }
          },
          info: {
            title: 'What happens next?',
            description:
              'License requests are typically reviewed within one business day. You will receive updates at each stage of the process.'
          },
          contact: {
            title: 'Need help?',
            chat: 'Start Live Chat'
          }
        },
        licenseRequestStatus: {
          progress: {
            title: 'Request Progress',
            subtitle: 'Track each phase from submission through completion.',
            badge: {
              completed: 'Completed',
              inProgress: 'In Progress'
            },
            steps: {
              sent: {
                title: 'Request Sent',
                complete: 'Submitted successfully',
                active: 'Submitted successfully',
                pending: 'Waiting to be submitted'
              },
              evaluation: {
                title: 'Evaluation',
                complete: 'Review completed',
                active: 'Under review',
                pending: 'Pending review'
              },
              buying: {
                title: 'Buying Process',
                complete: 'Provisioning started',
                active: 'Processing payment and provisioning licenses',
                pending: 'Pending'
              },
              done: {
                title: 'Done',
                complete: 'Completed',
                active: 'Completed',
                pending: 'Pending'
              }
            }
          },
          timeline: {
            title: 'Request Timeline',
            events: {
              submitted: {
                title: 'Request Submitted',
                description: 'Your license request has been submitted and assigned ID {{code}}.'
              },
              evaluation: {
                title: 'Under Evaluation',
                description: 'Our team is currently reviewing your request.'
              },
              buying: {
                title: 'Buying Process',
                description: 'Processing payment and provisioning licenses.'
              },
              completed: {
                title: 'Completed',
                description: 'Licenses activated and ready for use.'
              }
            },
            statusLabel: {
              complete: 'Completed',
              active: 'Currently in progress',
              pending: 'Pending'
            },
            pendingDate: 'Date pending',
            pendingCode: 'Not assigned yet'
          },
          details: {
            title: 'Request Details',
            requestId: 'Request ID',
            licenseType: 'License Type',
            company: 'Company',
            offer: 'Plan',
            quantity: 'Quantity',
            priority: 'Priority',
            department: 'Department',
            estimatedCost: 'Estimated cost',
            pricePerSeat: 'Price per seat',
            defaultPriority: 'Normal priority',
            quantityValue: '{{count}} licenses',
            singleQuantityValue: '{{count}} license',
            unavailable: 'Not provided'
          },
          estimated: {
            title: 'Estimated Completion',
            description: 'Your request is expected to be completed by {{date}}',
            fallback: 'Estimated completion date unavailable',
            progressLabel: '{{value}}% complete'
          },
          actions: {
            title: 'Actions',
            download: 'Download Request Details',
            modify: 'Modify Request',
            cancel: 'Cancel Request'
          },
          errors: {
            missingContext: 'We could not find the request details. Start a new request to continue.'
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
          label: 'Navegacao principal do portal',
          dashboard: 'Painel',
          analytics: 'Analise',
          integrations: 'Integracoes',
          admin: 'Admin',
          licenses: 'Licencas',
          support: 'Suporte GWS',
          billing: 'Faturamento',
          notifications: 'Ver notificacoes'
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
          addUser: 'Adicionar Usuario',
          export: 'Exportar Dados',
          manageRoles: 'Gerenciar Papeis',
          createRole: 'Criar Papel',
          signOut: 'Sair',
          signingOut: 'Saindo...',
          dismissNotification: 'Fechar notificação'
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
            updateRole: 'Atualizar papel',
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
          customerLinkTitle: 'Vincular {{name}} a um cliente',
          customerLinkSubtitle: 'Selecione qual cliente deve ser associado a este usuário.',
          customerLinkSelect: 'Cliente',
          customerLinkSelectPlaceholder: 'Busque ou digite um cliente',
          customerLinkConfirm: 'Vincular cliente',
          customerLinkSubmitting: 'Vinculando...',
          customerLinkCancel: 'Cancelar',
          customerLinkClose: 'Fechar diálogo',
          customerLinkLoading: 'Carregando clientes disponíveis...',
          customerLinkTrigger: 'Vincular cliente selecionado',
          openCustomerList: 'Mostrar opções de clientes',
          closeCustomerList: 'Ocultar opções de clientes',
          customerLinkNoneOption: 'Sem cliente',
          customerLinkNoResults: 'Nenhum cliente corresponde à sua busca.',
          customerLinkEmptyForUser: 'Nenhum mapeamento disponível para {{email}}.',
          customerLinkMissingSupabase: 'Cliente Supabase não configurado. Vinculação indisponível.',
          customerLinkMissingSelection: 'Selecione um cliente para continuar.',
          customerLinkSubmitError: 'Não foi possível vincular o usuário ao cliente selecionado. Tente novamente.',
          customerLinkLoadError: 'Não foi possível carregar os mapeamentos de clientes. Tente novamente mais tarde.',
          customerLinkSuccess: 'Vinculado a {{customer}}.',
          customerLinkCleared: 'Vinculação com cliente removida.',
          removeUser: 'Remover usuário',
          roleSelectLabel: 'Papel',
          roleSelectAria: 'Alterar papel de {{name}}',
          roleSelectPlaceholder: 'Selecione um papel',
          openRoleList: 'Mostrar opções de papéis',
          closeRoleList: 'Ocultar opções de papéis',
          roleSelectNoResults: 'Nenhum papel corresponde à sua busca.',
          roleUpdateSubmitting: 'Atualizando papel...',
          roleUpdateSuccess: 'Papel atualizado para {{role}}.',
          roleUpdateSubmitError: 'Não foi possível atualizar o papel. Tente novamente.',
          roleUpdateMissingSupabase: 'Cliente Supabase não configurado. Atualização de papel indisponível.',
          roleUpdateMissingUid: 'O usuário selecionado está sem identificador.',
          removeDialog: {
            title: 'Remover {{name}}?',
            description: 'Essa ação remove permanentemente o usuário do portal. Deseja continuar?',
            confirm: 'Sim, remover usuário',
            cancel: 'Cancelar',
            submitting: 'Removendo...',
            error: 'Não foi possível remover este usuário no momento. Tente novamente mais tarde.',
            missingSupabase: 'Cliente Supabase não configurado. Remoção indisponível.',
            missingUid: 'Identificador do usuário ausente. Remoção indisponível.',
            close: 'Fechar diálogo'
          },
          loading: 'Carregando usuarios...',
          empty: 'Nenhum usuario encontrado para os filtros atuais.',
          error: 'Nao foi possivel carregar os usuarios. Tente novamente.',
          pagination: {
            summary: 'Exibindo {{range}} de {{total}} usuários',
            prev: 'Anterior',
            next: 'Próximo'
          }
        }
      },
      customer: {
        nav: {
          label: 'Navegação do cliente',
          overview: 'Visão geral',
          licenses: 'Licenças',
          support: 'Suporte',
          notifications: 'Ver alertas e notificações'
        },
        hero: {
          greeting: 'Bem-vindo de volta, {{name}}',
          subtitle: 'Todas as suas informações do Google Workspace em um só lugar,',
          lastLogin: 'Último acesso: {{value}}',
          accountStatus: 'Status da conta: {{status}}',
          status: {
            active: 'Ativo'
          },
          companyLabel: 'Empresa:',
          companyAll: 'Todos os clientes'
        },
        actions: {
          refresh: 'Atualizar dados',
          retry: 'Tentar novamente'
        },
        error: {
          title: 'Não foi possível carregar seu painel.'
        },
        errors: {
          missingSupabase: 'Cliente Supabase não está configurado.',
          noCompanyMappings: 'Nenhum mapeamento de cliente está vinculado à sua conta.',
          noLicensingData: 'Nenhum dado de licenciamento foi retornado para as empresas vinculadas.',
          generic: 'Não foi possível carregar seus dados do cliente no momento.'
        },
        stats: {
          committed: {
            label: 'Licenças contratadas',
            helper: 'Em {{value}} concessões ativas'
          },
          active: {
            label: 'Licenças atribuídas',
            helperGain: '+{{value}} neste mês',
            helperFlat: 'Nenhuma nova licença neste mês'
          },
          available: {
            label: 'Licenças disponíveis',
            helper: 'Soma de licenças não utilizadas em todas as concessões'
          },
          utilization: {
            label: 'Utilização',
            helper: '{{value}} licenças ainda disponíveis'
          }
        },
        panels: {
          licenses: {
            title: 'Visão geral de licenças',
            description: 'Acompanhe a adoção por produto e plano.',
            empty: 'Nenhuma concessão encontrada para sua conta.'
          },
          alerts: {
            title: 'Alertas e renovações',
            description: 'Antecipe-se a marcos de contrato e uso.',
            empty: 'Nenhum alerta pendente. Seus serviços estão funcionando normalmente.'
          },
          quickActions: {
            title: 'Ações rápidas',
            description: 'Acesse rapidamente as tarefas que você mais realiza.'
          }
        },
        licenses: {
          table: {
            total: 'Total',
            assigned: 'Atribuídas',
            available: 'Disponíveis'
          },
          buy: 'Comprar licenças',
          priceCondition: {
            byResources: 'Preço condicionado por recursos',
            byLicenses: 'Preço por licença'
          },
          pricePerSeat: '{{value}} por licença'
        },
        status: {
          active: 'Ativo',
          suspended: 'Suspenso',
          pending: 'Pendente'
        },
        alerts: {
          suspension: {
            title: 'Status de {{product}}',
            description: '{{state}} — verifique a conta {{company}}'
          },
          renewal: {
            title: '{{product}}',
            description: '{{relative}} • {{date}}',
            total: '{{value}} licenças'
          },
          utilization: {
            title: 'Uso de {{product}}',
            description: '{{percent}} utilizados • {{assigned}} atribuídos'
          }
        },
        dates: {
          dateUnavailable: 'Data indisponível',
          expired: 'Expirado há {{days}}d',
          dueToday: 'Vence hoje',
          dueTomorrow: 'Vence amanhã',
          dueIn: 'Vence em {{days}}d'
        },
        quickActions: {
          requestLicenses: {
            label: 'Solicitar mais licenças',
            description: 'Inicie um pedido para assentos adicionais.'
          },
          supportTicket: {
            label: 'Abrir chamado de suporte',
            description: 'Relate problemas de produto ou cobrança.'
          },
          downloadReport: {
            label: 'Baixar relatório de uso',
            description: 'Exporte os detalhes recentes de utilização.'
          }
        },
        footer: {
          rights: '© {{year}} Tigabytes. Todos os direitos reservados.',
          company: 'Empresa',
          contact: 'Contato do suporte',
          terms: 'Termos de serviço',
          aria: 'Links úteis'
        },
        licenseRequest: {
          header: {
            title: 'Detalhes da Solicitação de Licenças',
            description:
              'Informe os detalhes da sua solicitação de licenças. Nossa equipe analisará e processará seu pedido em até um dia útil.'
          },
          alerts: {
            success: 'Sua solicitação foi registrada. Nossa equipe entrará em contato em breve.',
            missingSelection: 'Selecione uma licença na visão geral antes de preencher este formulário.'
          },
          errors: {
            licenseRequired: 'Selecione uma licença antes de enviar sua solicitação.',
            quantityInvalid: 'Informe um número inteiro maior que zero para a quantidade.',
            supabaseUnavailable: 'Cliente Supabase não está configurado.',
            companyRequired: 'Não foi possível determinar a empresa vinculada a esta solicitação.',
            entitlementRequired: 'Não foi possível determinar a concessão selecionada.',
            submissionFailed: 'Não foi possível registrar sua solicitação agora. Tente novamente.'
          },
          fields: {
            licenseType: {
              label: 'Tipo de licença',
              placeholder: 'Selecione uma licença na página anterior'
            },
            quantity: {
              label: 'Quantidade de licenças',
              placeholder: 'Informe a quantidade'
            },
            department: {
              label: 'Departamento / Equipe',
              placeholder: 'Informe o nome do departamento ou equipe'
            },
            justification: {
              label: 'Justificativa de negócios',
              placeholder: 'Descreva a necessidade de licenças adicionais...'
            }
          },
          actions: {
            cancel: 'Cancelar',
            submit: 'Enviar solicitação',
            submitting: 'Enviando…'
          },
          summary: {
            title: 'Resumo de licenças do cliente',
            description: 'Visão geral da sua alocação atual do Google Workspace.',
            items: {
              total: 'Total',
              assigned: 'Atribuídas',
              available: 'Disponíveis'
            },
            utilization: {
              label: 'Taxa de utilização'
            }
          },
          selection: {
            title: 'Seleção atual',
            labels: {
              license: 'Licença',
              company: 'Empresa',
              plan: 'Plano',
              pricePerSeat: 'Preço por assento',
              pricingNotes: 'Observações de preço',
              requestedSeats: 'Assentos solicitados',
              estimatedMonthly: 'Estimativa mensal'
            },
            empty: {
              license: 'Escolha uma licença'
            }
          },
          info: {
            title: 'O que acontece a seguir?',
            description:
              'Solicitações de licenças são geralmente analisadas em até um dia útil. Você receberá atualizações em cada etapa do processo.'
          },
          contact: {
            title: 'Precisa de ajuda?',
            chat: 'Iniciar chat ao vivo'
          }
        },
        licenseRequestStatus: {
          progress: {
            title: 'Progresso da solicitação',
            subtitle: 'Acompanhe cada etapa do pedido até a conclusão.',
            badge: {
              completed: 'Concluído',
              inProgress: 'Em andamento'
            },
            steps: {
              sent: {
                title: 'Solicitação enviada',
                complete: 'Enviado com sucesso',
                active: 'Enviado com sucesso',
                pending: 'Aguardando envio'
              },
              evaluation: {
                title: 'Avaliação',
                complete: 'Análise concluída',
                active: 'Em análise',
                pending: 'Aguardando análise'
              },
              buying: {
                title: 'Processo de compra',
                complete: 'Provisionamento iniciado',
                active: 'Processando pagamento e provisionamento',
                pending: 'Pendente'
              },
              done: {
                title: 'Concluído',
                complete: 'Concluído',
                active: 'Concluído',
                pending: 'Pendente'
              }
            }
          },
          timeline: {
            title: 'Linha do tempo da solicitação',
            events: {
              submitted: {
                title: 'Solicitação enviada',
                description: 'Sua solicitação de licenças foi registrada e recebeu o ID {{code}}.'
              },
              evaluation: {
                title: 'Em avaliação',
                description: 'Nossa equipe está analisando sua solicitação.'
              },
              buying: {
                title: 'Processo de compra',
                description: 'Processando pagamento e provisionando licenças.'
              },
              completed: {
                title: 'Concluído',
                description: 'Licenças ativadas e prontas para uso.'
              }
            },
            statusLabel: {
              complete: 'Concluído',
              active: 'Em andamento',
              pending: 'Pendente'
            },
            pendingDate: 'Data pendente',
            pendingCode: 'Ainda não atribuído'
          },
          details: {
            title: 'Detalhes da solicitação',
            requestId: 'ID da solicitação',
            licenseType: 'Tipo de licença',
            company: 'Empresa',
            offer: 'Plano',
            quantity: 'Quantidade',
            priority: 'Prioridade',
            department: 'Departamento',
            estimatedCost: 'Custo estimado',
            pricePerSeat: 'Preço por assento',
            defaultPriority: 'Prioridade normal',
            quantityValue: '{{count}} licenças',
            singleQuantityValue: '{{count}} licença',
            unavailable: 'Não informado'
          },
          estimated: {
            title: 'Previsão de conclusão',
            description: 'Sua solicitação deve ser concluída até {{date}}',
            fallback: 'Previsão de conclusão indisponível',
            progressLabel: '{{value}}% concluído'
          },
          actions: {
            title: 'Ações',
            download: 'Baixar detalhes da solicitação',
            modify: 'Modificar solicitação',
            cancel: 'Cancelar solicitação'
          },
          errors: {
            missingContext: 'Não encontramos os detalhes da solicitação. Inicie um novo pedido para continuar.'
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
          label: 'Navegacion principal del portal',
          dashboard: 'Panel',
          analytics: 'Analiticas',
          integrations: 'Integraciones',
          admin: 'Admin',
          licenses: 'Licencias',
          support: 'Soporte GWS',
          billing: 'Facturacion',
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
          createRole: 'Crear Rol',
          signOut: 'Cerrar sesion',
          signingOut: 'Cerrando sesion...',
          dismissNotification: 'Cerrar notificación'
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
            updateRole: 'Actualizar rol',
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
          customerLinkTitle: 'Vincular a {{name}} con un cliente',
          customerLinkSubtitle: 'Selecciona qué cliente debe asociarse a este usuario.',
          customerLinkSelect: 'Cliente',
          customerLinkSelectPlaceholder: 'Busca o escribe un cliente',
          customerLinkConfirm: 'Vincular cliente',
          customerLinkSubmitting: 'Vinculando...',
          customerLinkCancel: 'Cancelar',
          customerLinkClose: 'Cerrar diálogo',
          customerLinkLoading: 'Cargando clientes disponibles...',
          customerLinkTrigger: 'Vincular cliente seleccionado',
          openCustomerList: 'Mostrar opciones de clientes',
          closeCustomerList: 'Ocultar opciones de clientes',
          customerLinkNoneOption: 'Sin cliente',
          customerLinkNoResults: 'Ningún cliente coincide con tu búsqueda.',
          customerLinkEmptyForUser: 'No hay mapeos disponibles para {{email}}.',
          customerLinkMissingSupabase: 'El cliente de Supabase no está configurado. Vinculación no disponible.',
          customerLinkMissingSelection: 'Selecciona un cliente para continuar.',
          customerLinkSubmitError: 'No se pudo vincular al usuario con el cliente seleccionado. Inténtalo nuevamente.',
          customerLinkLoadError: 'No se pudieron cargar los mapeos de clientes. Inténtalo nuevamente más tarde.',
          customerLinkSuccess: 'Vinculado a {{customer}}.',
          customerLinkCleared: 'Se quitó la vinculación con el cliente.',
          removeUser: 'Eliminar usuario',
          roleSelectLabel: 'Rol',
          roleSelectAria: 'Cambiar rol de {{name}}',
          roleSelectPlaceholder: 'Selecciona un rol',
          openRoleList: 'Mostrar opciones de roles',
          closeRoleList: 'Ocultar opciones de roles',
          roleSelectNoResults: 'Ningún rol coincide con tu búsqueda.',
          roleUpdateSubmitting: 'Actualizando rol...',
          roleUpdateSuccess: 'Rol actualizado a {{role}}.',
          roleUpdateSubmitError: 'No se pudo actualizar el rol. Inténtalo nuevamente.',
          roleUpdateMissingSupabase: 'El cliente de Supabase no está configurado. Actualización de rol no disponible.',
          roleUpdateMissingUid: 'El usuario seleccionado no tiene identificador.',
          removeDialog: {
            title: '¿Eliminar a {{name}}?',
            description: 'Esta acción eliminará permanentemente al usuario del portal. ¿Deseas continuar?',
            confirm: 'Sí, eliminar usuario',
            cancel: 'Cancelar',
            submitting: 'Eliminando...',
            error: 'No fue posible eliminar a este usuario por ahora. Inténtalo de nuevo más tarde.',
            missingSupabase: 'El cliente de Supabase no está configurado. Eliminación no disponible.',
            missingUid: 'Falta el identificador del usuario. Eliminación no disponible.',
            close: 'Cerrar diálogo'
          },
          loading: 'Cargando usuarios...',
          empty: 'No se encontraron usuarios para los filtros actuales.',
          error: 'No fue posible cargar los usuarios. Intenta de nuevo.',
          pagination: {
            summary: 'Mostrando {{range}} de {{total}} usuarios',
            prev: 'Anterior',
            next: 'Siguiente'
          }
        }
      },
      customer: {
        nav: {
          label: 'Navegación del cliente',
          overview: 'Resumen',
          licenses: 'Licencias',
          support: 'Soporte',
          notifications: 'Ver alertas y notificaciones'
        },
        hero: {
          greeting: 'Bienvenido de nuevo, {{name}}',
          subtitle: 'Toda tu información de Google Workspace en un solo lugar,',
          lastLogin: 'Último acceso: {{value}}',
          accountStatus: 'Estado de la cuenta: {{status}}',
          status: {
            active: 'Activo'
          },
          companyLabel: 'Empresa:',
          companyAll: 'Todos los clientes'
        },
        actions: {
          refresh: 'Actualizar datos',
          retry: 'Reintentar'
        },
        error: {
          title: 'No pudimos cargar tu panel.'
        },
        errors: {
          missingSupabase: 'El cliente de Supabase no está configurado.',
          noCompanyMappings: 'No hay asignaciones de cliente vinculadas a tu cuenta.',
          noLicensingData: 'No se devolvieron datos de licencias para las empresas vinculadas.',
          generic: 'No pudimos cargar tus datos de cliente en este momento.'
        },
        stats: {
          committed: {
            label: 'Asientos comprometidos',
            helper: 'En {{value}} concesiones activas'
          },
          active: {
            label: 'Licencias asignadas',
            helperGain: '+{{value}} este mes',
            helperFlat: 'No hay licencias nuevas este mes'
          },
          available: {
            label: 'Licencias disponibles',
            helper: 'Suma de asientos sin usar en todas las concesiones'
          },
          utilization: {
            label: 'Utilización',
            helper: '{{value}} asientos aún disponibles'
          }
        },
        panels: {
          licenses: {
            title: 'Resumen de licencias',
            description: 'Sigue la adopción por producto y plan.',
            empty: 'No se encontraron concesiones para tu cuenta.'
          },
          alerts: {
            title: 'Alertas y renovaciones',
            description: 'Anticípate a los hitos de contrato y uso.',
            empty: 'No hay alertas pendientes. Tus servicios funcionan con normalidad.'
          },
          quickActions: {
            title: 'Acciones rápidas',
            description: 'Accede rápido a las tareas que gestionas con frecuencia.'
          }
        },
        licenses: {
          table: {
            total: 'Total',
            assigned: 'Asignadas',
            available: 'Disponibles'
          },
          buy: 'Comprar licencias',
          priceCondition: {
            byResources: 'Precio basado en recursos',
            byLicenses: 'Precio por licencia'
          },
          pricePerSeat: '{{value}} por licencia'
        },
        status: {
          active: 'Activo',
          suspended: 'Suspendido',
          pending: 'Pendiente'
        },
        alerts: {
          suspension: {
            title: 'Estado de {{product}}',
            description: '{{state}} — revisa la cuenta {{company}}'
          },
          renewal: {
            title: '{{product}}',
            description: '{{relative}} • {{date}}',
            total: '{{value}} licencias'
          },
          utilization: {
            title: 'Uso de {{product}}',
            description: '{{percent}} utilizados • {{assigned}} asignados'
          }
        },
        dates: {
          dateUnavailable: 'Fecha no disponible',
          expired: 'Vencido hace {{days}}d',
          dueToday: 'Vence hoy',
          dueTomorrow: 'Vence mañana',
          dueIn: 'Vence en {{days}}d'
        },
        quickActions: {
          requestLicenses: {
            label: 'Solicitar más licencias',
            description: 'Inicia un pedido de asientos adicionales.'
          },
          supportTicket: {
            label: 'Crear ticket de soporte',
            description: 'Reporta problemas de producto o facturación.'
          },
          downloadReport: {
            label: 'Descargar informe de uso',
            description: 'Exporta los detalles recientes de utilización.'
          }
        },
        footer: {
          rights: '© {{year}} Tigabytes. Todos los derechos reservados.',
          company: 'Empresa',
          contact: 'Contactar soporte',
          terms: 'Términos del servicio',
          aria: 'Enlaces útiles'
        },
        licenseRequest: {
          header: {
            title: 'Detalles de la Solicitud de Licencias',
            description:
              'Proporciona los detalles de tu solicitud de licencias. Nuestro equipo revisará y procesará tu pedido dentro de un día hábil.'
          },
          alerts: {
            success: 'Tu solicitud fue registrada. Nuestro equipo se comunicará contigo en breve.',
            missingSelection: 'Selecciona una licencia en la vista general antes de completar este formulario.'
          },
          errors: {
            licenseRequired: 'Selecciona una licencia antes de enviar tu solicitud.',
            quantityInvalid: 'Ingresa un número entero mayor que cero para la cantidad.',
            supabaseUnavailable: 'El cliente de Supabase no está configurado.',
            companyRequired: 'No pudimos determinar la empresa asociada a esta solicitud.',
            entitlementRequired: 'No pudimos identificar la concesión seleccionada.',
            submissionFailed: 'No fue posible registrar tu solicitud en este momento. Inténtalo nuevamente.'
          },
          fields: {
            licenseType: {
              label: 'Tipo de licencia',
              placeholder: 'Selecciona una licencia en la página anterior'
            },
            quantity: {
              label: 'Número de licencias',
              placeholder: 'Ingresa la cantidad'
            },
            department: {
              label: 'Departamento / Equipo',
              placeholder: 'Ingresa el nombre del departamento o equipo'
            },
            justification: {
              label: 'Justificación comercial',
              placeholder: 'Explica la necesidad de licencias adicionales...'
            }
          },
          actions: {
            cancel: 'Cancelar',
            submit: 'Enviar solicitud',
            submitting: 'Enviando…'
          },
          summary: {
            title: 'Resumen de licencias del cliente',
            description: 'Vista general de tu asignación actual de Google Workspace.',
            items: {
              total: 'Total',
              assigned: 'Asignadas',
              available: 'Disponibles'
            },
            utilization: {
              label: 'Tasa de utilización'
            }
          },
          selection: {
            title: 'Selección actual',
            labels: {
              license: 'Licencia',
              company: 'Empresa',
              plan: 'Plan',
              pricePerSeat: 'Precio por asiento',
              pricingNotes: 'Notas de precios',
              requestedSeats: 'Asientos solicitados',
              estimatedMonthly: 'Estimado mensual'
            },
            empty: {
              license: 'Elige una licencia'
            }
          },
          info: {
            title: '¿Qué sigue?',
            description:
              'Las solicitudes de licencias se revisan normalmente en un día hábil. Recibirás actualizaciones en cada etapa del proceso.'
          },
          contact: {
            title: '¿Necesitas ayuda?',
            chat: 'Iniciar chat en vivo'
          }
        },
        licenseRequestStatus: {
          progress: {
            title: 'Progreso de la solicitud',
            subtitle: 'Sigue cada etapa del pedido hasta su finalización.',
            badge: {
              completed: 'Completado',
              inProgress: 'En progreso'
            },
            steps: {
              sent: {
                title: 'Solicitud enviada',
                complete: 'Enviada correctamente',
                active: 'Enviada correctamente',
                pending: 'En espera de envío'
              },
              evaluation: {
                title: 'Evaluación',
                complete: 'Revisión completada',
                active: 'En revisión',
                pending: 'Pendiente de revisión'
              },
              buying: {
                title: 'Proceso de compra',
                complete: 'Provisionamiento iniciado',
                active: 'Procesando pago y aprovisionamiento',
                pending: 'Pendiente'
              },
              done: {
                title: 'Finalizado',
                complete: 'Completado',
                active: 'Completado',
                pending: 'Pendiente'
              }
            }
          },
          timeline: {
            title: 'Línea de tiempo de la solicitud',
            events: {
              submitted: {
                title: 'Solicitud enviada',
                description: 'Tu solicitud de licencias fue registrada y recibió el ID {{code}}.'
              },
              evaluation: {
                title: 'En evaluación',
                description: 'Nuestro equipo está revisando tu solicitud.'
              },
              buying: {
                title: 'Proceso de compra',
                description: 'Procesando pago y aprovisionamiento de licencias.'
              },
              completed: {
                title: 'Completado',
                description: 'Licencias activadas y listas para usar.'
              }
            },
            statusLabel: {
              complete: 'Completado',
              active: 'En curso',
              pending: 'Pendiente'
            },
            pendingDate: 'Fecha pendiente',
            pendingCode: 'Aún no asignado'
          },
          details: {
            title: 'Detalles de la solicitud',
            requestId: 'ID de la solicitud',
            licenseType: 'Tipo de licencia',
            company: 'Empresa',
            offer: 'Plan',
            quantity: 'Cantidad',
            priority: 'Prioridad',
            department: 'Departamento',
            estimatedCost: 'Costo estimado',
            pricePerSeat: 'Precio por asiento',
            defaultPriority: 'Prioridad normal',
            quantityValue: '{{count}} licencias',
            singleQuantityValue: '{{count}} licencia',
            unavailable: 'No proporcionado'
          },
          estimated: {
            title: 'Fecha estimada de finalización',
            description: 'Se espera completar tu solicitud para el {{date}}',
            fallback: 'Fecha estimada de finalización no disponible',
            progressLabel: '{{value}}% completado'
          },
          actions: {
            title: 'Acciones',
            download: 'Descargar detalles de la solicitud',
            modify: 'Modificar solicitud',
            cancel: 'Cancelar solicitud'
          },
          errors: {
            missingContext: 'No encontramos los detalles de la solicitud. Inicia un nuevo pedido para continuar.'
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
