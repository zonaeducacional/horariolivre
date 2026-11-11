import { IElectronAPI } from '../../../preload/index';

declare global {
  interface Window {
    api?: IElectronAPI;
  }
}
