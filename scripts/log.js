import {techConfig as config} from "./config";

export const logDebug = (...args) => config.isDebug && console.log(...args)