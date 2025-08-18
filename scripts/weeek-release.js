import process from 'node:process'
import {techConfig, validateConfig, weeekApiConfig} from "./config.js";
import {createWeeekTag, getWeeekTask, updateWeeekTask} from "./api/weeek-api.js";

export const config = {
    // weeek
    ...weeekApiConfig,
    // github
    githubPrBody: process.env.GITHUB_PR_BODY,
    githubPrTitle: process.env.GITHUB_PR_TITLE,
    // tech
    ...techConfig
}

function getWeeekTaskIds(commitsRaw) {
    if (!commitsRaw) return []

    const taskIds = Array.from(commitsRaw.matchAll(/\[WEEEK-(\d+)\]/g)).map(match => match[1]).filter(Boolean)
    return Array.from(new Set(taskIds))
}

async function main() {
    try {
        validateConfig(config)

        const taskIds = getWeeekTaskIds(config.githubPrBody)

        if (!taskIds.length) return

        const tag = await createWeeekTag({ title: config.githubPrTitle })

        if (!taskIds.length) return

        taskIds.forEach(async (taskId) => {

            const task =  await getWeeekTask(taskId)
            const taskTags = task.tags ?? []

            await updateWeeekTask(taskId, {tags: [...taskTags, tag.id]})
        })
    } catch (error) {
        console.error('❌ Error in weeek release:', error)
        process.exit(1)
    }
}

main()