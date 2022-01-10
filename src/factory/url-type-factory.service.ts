import { Inject, Injectable, Injector } from '@angular/core';

import { Transition } from '@uirouter/angular';
import { UIRouter } from '@uirouter/core/lib/router';
import { StateObject } from '@uirouter/core/lib/state';
import { Param } from '@uirouter/core/lib/params';

import {
    UrlTypeFactoryConfiguration,
    URL_TYPE_FACTORY_CONFIGURATION
} from './url-type-factory-configuration';
import {
    UrlTypeFactoryRegistrationError,
    UrlTypeFactoryResolveError
} from './url-type-factory-error';


const REPR_TOKEN = '__ngx_ui_router_url_type__repr';
const RSLV_TOKEN = '__ngx_ui_router_url_type__rslv';


/**
 * Interface a URL matcher type must implement.
 */
export interface UrlType<T> {

    /**
     * Name of the new type.
     */
    name: string;

    /**
     * Regex the new type should match in the URL.
     */
    match: RegExp;

    /**
     * Method that returns the URL representation of the given object as string.
     * @param {T} obj
     * @returns {string}
     */
    represent: (obj: T) => string;

    /**
     * Method that returns a promise resolving to the actual fetched object. If the
     * returned Promise gets rejected, the router transitions to an error.
     * @param {string} matched
     * @param {Injector} injector
     * @returns {Promise<T> | {$promise: Promise<T>} | any}
     */
    resolve: (matched: string, injector: Injector) => Promise<T> | { $promise: Promise<T> } | any;

    /**
     * Determines if the data of this type can be bound to an component by
     * the `@Input()` decorator.
     */
    bindable?: boolean;

}


@Injectable()
export class UrlTypeFactoryService {

    protected _registeredTypes: UrlType<any>[] = [];
    protected _bindableTypes: UrlType<any>[] = [];

    constructor(@Inject(URL_TYPE_FACTORY_CONFIGURATION) protected _configuration: UrlTypeFactoryConfiguration) {
    }

    get configuration() {
        return this._configuration;
    }

    /**
     * Gets all parameters for the given transition and returns a promise that resolves as soon
     * as all promise parameters of the transition are resolved.
     * @param {Transition} transition
     * @returns {Promise<any[]>}
     */
    doTransition(transition: Transition) {
         const targetParams = transition.params('to'),
            targetParamIds = this.getTypeIdsFromStateObject(transition.targetState().$state(), false),
            targetParamBindableIds = this.getTypeIdsFromStateObject(transition.targetState().$state(), true),
            targetPromises = [];

        for (const targetParamId of targetParamIds) {
            const targetParamValue = targetParams[targetParamId],
                  targetParamResolved = targetParamValue[RSLV_TOKEN]();
            let targetParamPromise: Promise<any> = targetParamResolved && targetParamResolved['$promise'];

            /*
             * If we do not work on a promise object, make a promise out of
             * the object.
             */
            if (!targetParamPromise ||
                !targetParamPromise['then'] ||
                typeof targetParamPromise['then'] !== 'function') {
                /*
                 * We do not work on a promise, so we create a resolved promise of the object.
                 */
                targetParamPromise = Promise.resolve(targetParamResolved);
            }

            /*
             * Wait for the promise to resolve and remove the representation token from
             * the resolved object. Catch errors in resolving the promise and throw
             * an exception in this case.
             */
            targetParamPromise = targetParamPromise
                .then((resolved) => {
                    const treeParams = transition.treeChanges()['to'];

                    for (const nodeParams of treeParams) {
                        const nodeParamValues = nodeParams.paramValues || {};

                        if (nodeParamValues.hasOwnProperty(targetParamId)) {
                            nodeParamValues[targetParamId] = resolved;
                        }
                    }

                    return resolved;
                })
                .catch((error) => {
                    throw new UrlTypeFactoryResolveError(
                        `The URL parameter '${targetParamId}' rejected. The error was:
                        ${error}.`
                    );
                });

            /*
             * Push the promise to the list of promises in this transaction.
             */
            targetPromises.push(targetParamPromise);

            /*
             * Add the value to the resolvable types of this transition if we are
             * working on a bindable type.
             */
            if (targetParamBindableIds.indexOf(targetParamId) !== -1) {
                transition.addResolvable({
                    token: targetParamId,
                    deps: [Transition],
                    resolveFn: (t) => t.params()[targetParamId],
                });
            }
        }

        return <Promise<any>>Promise.all(targetPromises);
    }

    /**
     * Gets a registered type by its name. Returns `null` if there is no type with the given name.
     * @param {string} name
     * @param {boolean} bindableOnly
     * @returns {UrlType<any>}
     */
    getTypeByName(name: string, bindableOnly: boolean): UrlType<any> {
        const types = bindableOnly ? this._bindableTypes : this._registeredTypes;

        for (const type of types) {
            if (type.name === name) {
                return type;
            }
        }
        return null;
    }

    /**
     * Gets the ui-router types from the state object that are types created by ngx-ui-router-url-type.
     * @param {StateObject} state
     * @param {boolean} bindableOnly
     * @returns {Param[]}
     */
    getTypeParamsFromStateObject(state: StateObject, bindableOnly: boolean): Param[] {
        const foundParams: Param[] = [];

        for (const pathState of state.path) {
            const params = pathState.params || {};

            for (const paramName of Object.keys(params)) {
                const param = params[paramName];

                if (this.getTypeByName(param.type.name, bindableOnly)) {
                    foundParams.push(param);
                }
            }
        }


        return foundParams;
    }

    /**
     * Gets the IDs of the ngx-ui-router-url-type types for the given state.
     * @param {StateObject} state
     * @param {boolean} bindableOnly
     * @returns {string[]}
     */
    getTypeIdsFromStateObject(state: StateObject, bindableOnly: boolean): string[] {
        return this.getTypeParamsFromStateObject(state, bindableOnly)
            .map((p) => p.id);
    }

    /**
     * Registers the given type implementation on the ui-router.
     * @param {UrlType<T>} type
     * @param {UIRouter} router
     * @param {Injector} injector
     */
    registerType<T>(type: UrlType<T>, router: UIRouter, injector: Injector) {
        /*
         * Assert there is no type with the name of the given type registered.
         */
        for (const registeredType of this._registeredTypes) {
            if (type.name === registeredType.name) {
                throw new UrlTypeFactoryRegistrationError(
                    `There is already a type with the
                    name '${registeredType.name}' registered.`
                );
            }
        }

        /*
         * Push the type to the list of already registered types.
         */
        this._registeredTypes.push(type);

        if (type.bindable) {
            this._bindableTypes.push(type);
        }

        /*
         * Register the new type on the ui-router url service.
         */
        router.urlService.config.type(
            type.name,
            {
                encode: (obj) => {
                    if (!!obj[REPR_TOKEN]) {
                        return obj[REPR_TOKEN];
                    } else {
                        return type.represent(obj);
                    }
                },
                decode: (repr) => {
                    const obj = {};

                    if (repr && typeof repr === 'object') {
                        obj[REPR_TOKEN] = type.represent(repr);
                        obj[RSLV_TOKEN] = () => repr;
                    } else {
                        obj[REPR_TOKEN] = repr;
                        obj[RSLV_TOKEN] = () => type.resolve(repr, injector);
                    }

                    return obj;
                },
                is: (obj) => {
                    return !!obj &&
                        typeof obj === 'object' &&
                        obj.hasOwnProperty(REPR_TOKEN) &&
                        obj.hasOwnProperty(RSLV_TOKEN);
                },
                equals: (a, b) => {
                    if (a && b &&
                        typeof a === 'object' && typeof b === 'object' &&
                        a.hasOwnProperty(REPR_TOKEN) && b.hasOwnProperty(REPR_TOKEN)) {
                        /*
                         * Compare objects by `REPR_TOKEN`, if available.
                         */
                        return a[REPR_TOKEN] === b[REPR_TOKEN];
                    } else if (a && b &&
                        typeof a === 'object' && typeof b === 'object') {
                        /*
                         * Compare objects by the `represent` result if `REPR_TOKEN` is not available.
                         */
                        return type.represent(a).toUpperCase() === type.represent(b).toUpperCase();
                    } else {
                        /*
                         * Compare directly if we are not working on objects.
                         */
                        return a === b;
                    }
                },
                pattern: type.match,
            }
        );
    }

}
