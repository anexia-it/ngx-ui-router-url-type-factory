import { ModuleWithProviders, NgModule } from '@angular/core';

import { UrlTypeFactoryService } from "./factory/url-type-factory.service";
import {
    UrlTypeFactoryConfiguration,
    URL_TYPE_FACTORY_CONFIGURATION
} from "./factory/url-type-factory-configuration";


@NgModule({
    imports: [],
    exports: [],
    declarations: [],
    providers: [/* declare in `forRoot()` */],
})
export class NgxUIRouterUrlTypeFactoryModule {

    static forRoot(config: UrlTypeFactoryConfiguration): ModuleWithProviders<NgxUIRouterUrlTypeFactoryModule> {
        return {
            ngModule: NgxUIRouterUrlTypeFactoryModule,
            providers: [
                UrlTypeFactoryService,
                {
                    provide: URL_TYPE_FACTORY_CONFIGURATION,
                    useValue: config,
                }
            ]
        };
    }

}
