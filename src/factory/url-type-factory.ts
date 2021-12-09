import { Injector } from '@angular/core';

import { Transition } from '@uirouter/angular';
import { UIRouter } from '@uirouter/core/lib/router';

import { UrlTypeFactoryService } from './url-type-factory.service';


/**
 * Configures the ui-router module.
 * @param {UIRouter} router
 * @param {Injector} injector
 */
export function configure(router: UIRouter, injector: Injector) {
    const service = injector.get(UrlTypeFactoryService),
        configuration = service.configuration;

    /*
     * Register all types of the module configuration.
     */
    for (const typeClass of configuration.types) {
        service.registerType(new typeClass(), router, injector);
    }

    /*
     * Configure the transition event handler to deal with the ui-router types.
     */
    router.transitionService.onStart(
        {
            to: (state) => {
                return service.getTypeParamsFromStateObject(state, false).length !== 0;
            }
        },
        (transition: Transition) => {
            return service.doTransition(transition);
        }
    );
}
