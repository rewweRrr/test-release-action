import {weeekApiConfig as config} from "../config.js";
import {logDebug} from "../log.js";


async function fetchWeeek(endpoint, options = {}) {
    const url = `https://api.weeek.net/public/v1/${endpoint}`
    const response = await fetch(url, {
        ...options, headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.weeekApiKey}`,
        }
    })

    if (!response.ok) {
        const errorBody = await response.text()
        throw new Error(`Weeek API error. \n Url: ${url} \n Options: ${JSON.stringify(options, null, 2)} \n Status: ${response.status} \n Body: ${errorBody}`)
    }

    const data = await response.json()

    if (!data.success) {
        throw new Error(`Weeek API error. Url: ${url} \n Options: ${JSON.stringify(options, null, 2)}`)
    }
    return data
}

export async function getWeeekWorkspace() {
    logDebug(`Receiving weeek workspace`)
    const data = await fetchWeeek('ws')
    return data.workspace
}

export async function getWeeekTask(taskId) {
    logDebug(`Receiving weeek task ${taskId}`)
    const data = await fetchWeeek(`tm/tasks/${taskId}`)
    return data.task
}

export async function updateWeeekTask(taskId, body) {
    logDebug(`Updating weeek task ${taskId} with body: ${JSON.stringify(body, null, 2)}`)
    const data = await fetchWeeek(`tm/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify(body),
    })

    return data.task
}

export async function createWeeekTag(body) {
    logDebug(`Create weeek tag with body: ${JSON.stringify(body, null, 2)}`)
    const data = await fetchWeeek('ws/tags', {
        method: 'POST',
        body: JSON.stringify(body),
    })
    return data.tag
}