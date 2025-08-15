import process from 'node:process'

function getWeeekTaskIds(commitsRaw: string) {
  if (!commitsRaw) return []

  const taskIds = Array.from(commitsRaw.matchAll(/\[WEEEK-(\d+)\]/g)).map(match => match[1]).filter(Boolean)
  return Array.from(new Set(taskIds))
}

function main() {
  const prBody = process.env.GITHUB_PR_BODY || ''
  const prTitle = process.env.GITHUB_PR_TITLE || ''
  const weeekApiKey = process.env.WEEEK_API_KEY

  const taskIds = getWeeekTaskIds(prBody)

  const tagsOptions = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${weeekApiKey}` },
    body: JSON.stringify({ title: prTitle }),
  }

  if (!taskIds.length) return

  fetch('https://api.weeek.net/public/v1/ws/tags', tagsOptions)
    .then(response => response.json())
    .then((response) => {
      if (response.success && response.tag) {
        taskIds.forEach((taskId) => {
          const options = {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${weeekApiKey}` },
            body: JSON.stringify({
              tags: [response.tag.id],
            }),
          }

          fetch(`https://api.weeek.net/public/v1/tm/tasks/${taskId}`, options)
            .then(response => response.json())
            .then(response => console.log(response))
            .catch(err => console.error(err))
        })
      }
    })
    .catch(err => console.error(err))
}

main()
