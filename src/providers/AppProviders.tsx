import React from 'react';
import { AuthProvider } from './AuthProvider';
import { SocketProvider } from './SocketProvider';
import { NotificationProvider } from './NotificationProvider';
import { InAppBannerProvider } from '../components/feedback/InAppBannerProvider';
import { ToastProvider } from './ToastProvider';
import { NetworkProvider } from './NetworkProvider';
import { AppAlertHost } from '../components/feedback/AppAlert';

export const AppProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <AuthProvider>
      <SocketProvider>
        <InAppBannerProvider>
          <NotificationProvider>
            <ToastProvider>
              <NetworkProvider>
                {children}
                <AppAlertHost />
              </NetworkProvider>
            </ToastProvider>
          </NotificationProvider>
        </InAppBannerProvider>
      </SocketProvider>
    </AuthProvider>
  );
};
