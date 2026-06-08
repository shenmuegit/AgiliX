import type { Project, ProjectId } from '../domain/types'

export type ProjectFilterValue = ProjectId | 'all'

export function ProjectFilter({ projects, value, onChange }: { projects: Project[]; value: ProjectFilterValue; onChange: (value: ProjectFilterValue) => void }) {
  return (
    <label>
      项目
      <select aria-label="项目" value={value} onChange={(event) => onChange(event.currentTarget.value as ProjectFilterValue)}>
        <option value="all">全部</option>
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </select>
    </label>
  )
}
