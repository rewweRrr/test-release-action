import process from 'node:process'
import {
    createWeeekTag,
    createWeeekTask,
    getWeeekTask, getWeeekWorkspace,
    moveWeeekTaskToColumn,
    updateWeeekTask,
} from './shared/api/weeek-api.js'
import { techConfig, validateConfig, weeekApiConfig } from './shared/utils/config.js'

export const config = {
  // weeek
  ...weeekApiConfig,
  weeekDoneColumnId: 3,
  weeekProjectId: 1,
  weeekReleaseColumnId: 20,
  // github
  githubPrBody: process.env.GITHUB_PR_BODY,
  githubPrTitle: process.env.GITHUB_PR_TITLE,
  // tech
  ...techConfig,
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

    const ws = await getWeeekWorkspace()

      const links = []

    for (const taskId of taskIds) {
      try {
        const task = await getWeeekTask(taskId)

        links.push(`<a href="https://app.weeek.net/ws/${ws.id}/task/${taskId}">[WEEEK-${taskId}]</a> ${task.title}`)

        const taskTags = task.tags ?? []

        await updateWeeekTask(taskId, { tags: [...taskTags, tag.id] })

        await moveWeeekTaskToColumn(taskId, { boardColumnId: config.weeekDoneColumnId })
      }
      catch (error) {
        console.error('❌ Error in weeek release: ', `changing task: taskId ${taskId}`, error)
      }
    }

    const task = await createWeeekTask({
      locations: [
        {
          projectId: config.weeekProjectId,
          boardColumnId: config.weeekReleaseColumnId,
        },
      ],
      title: config.githubPrTitle,
      description: links.join('\n'),
      type: 'action',
    })
    await updateWeeekTask(task.id, { tags: [tag.id] })
  }
  catch (error) {
    console.error('❌ Error in weeek release: ', error)
    process.exit(1)
  }
}

main()
