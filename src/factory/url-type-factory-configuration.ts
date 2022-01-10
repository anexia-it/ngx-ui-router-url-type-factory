import { InjectionToken, Type } from '@angular/core';

import { UrlType } from './url-type-factory.service';


export interface UrlTypeFactoryConfiguration {
    types: Type<UrlType<any>>[];
}


export const URL_TYPE_FACTORY_CONFIGURATION =
    new InjectionToken<UrlTypeFactoryConfiguration>('NGX_UI_ROUTER_URL_TYPE_FACTORY_CONFIGURATION');
