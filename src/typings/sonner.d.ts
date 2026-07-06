// Global type declarations for modules without TypeScript declarations
declare module 'sonner' {
  export interface ToastOptions {
    description?: string;
    duration?: number;
    icon?: React.ReactNode;
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center';
    style?: React.CSSProperties;
    className?: string;
    dismissible?: boolean;
    id?: string | number;
    unstyled?: boolean;
    action?: {
      label: string;
      onClick: () => void;
    };
  }

  export interface ToasterProps {
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center';
    toastOptions?: ToastOptions;
    richColors?: boolean;
    expand?: boolean;
    duration?: number;
    visibleToasts?: number;
    closeButton?: boolean;
    theme?: 'light' | 'dark' | 'system';
  }

  export const Toaster: React.FC<ToasterProps>;

  type ExternalToast = Omit<ToastOptions, 'description'> & { description?: React.ReactNode };
  
  export const toast: {
    (message: string, options?: ExternalToast): string | number;
    success(message: string, options?: ExternalToast): string | number;
    error(message: string, options?: ExternalToast): string | number;
    warning(message: string, options?: ExternalToast): string | number;
    info(message: string, options?: ExternalToast): string | number;
    loading(message: string, options?: ExternalToast): string | number;
    dismiss(id?: string | number): void;
    promise<T>(promise: Promise<T>, options: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: unknown) => string);
    }): Promise<T>;
  };
}
