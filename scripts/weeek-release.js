import process from 'node:process'
import {
  createWeeekTag,
  createWeeekTask,
  getWeeekTask,
  moveWeeekTaskToColumn,
  updateWeeekTask,
} from './shared/api/weeek-api.js'
import { techConfig, validateConfig, weeekApiConfig } from './shared/utils/config.js'

export const config = {
  // weeek
  ...weeekApiConfig,
  weeekDoneColumnId: 3,
  projectId: 1,
  releaseBoardColumnId: 20,
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

    for (const taskId of taskIds) {
      try {
        const task = await getWeeekTask(taskId)
        const taskTags = task.tags ?? []

        await updateWeeekTask(taskId, { tags: [...taskTags, tag.id] })

        await moveWeeekTaskToColumn(taskId, { releaseBoardColumnId: config.weeekDoneColumnId })
      }
      catch (error) {
        console.error('❌ Error in weeek release: ', `changing task: taskId ${taskId}`, error)
      }
    }

    const task = await createWeeekTask({
      locations: [
        {
          projectId: config.projectId,
          releaseBoardColumnId: config.releaseBoardColumnId,
        },
      ],
      title: config.githubPrTitle,
      description: config.githubPrBody,
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
