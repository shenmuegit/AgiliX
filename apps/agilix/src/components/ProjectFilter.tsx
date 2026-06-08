import { useState } from 'react'
import type { Project, ProjectId } from '../domain/types'

export type ProjectFilterValue = ProjectId | 'all'

export function ProjectFilter({
  projects,
  value,
  onChange,
}: {
  projects: Project[]
  value: ProjectFilterValue
  onChange: (value: ProjectFilterValue) => void
}) {
  const [open, setOpen] = useState(false)
  const selectedProject = value === 'all' ? null : projects.find((project) => project.id === value)
  const label = selectedProject ? selectedProject.name : '全部项目'

  return (
    <div className="project-filter">
      <button
        aria-expanded={open}
        aria-label={`项目筛选 ${label}`}
        className="btn btn-ghost project-filter-trigger"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M4 6h16M7 12h10M10 18h4" />
        </svg>
        {label}
      </button>
      {open ? (
        <div className="project-filter-menu">
          <button
            aria-label="选择项目 全部项目"
            className={`project-filter-item ${value === 'all' ? 'on' : ''}`}
            onClick={() => {
              onChange('all')
              setOpen(false)
            }}
            type="button"
          >
            <span className="project-filter-glyph">全</span>
            <b>全部项目</b>
          </button>
          {projects.map((project) => (
            <button
              aria-label={`选择项目 ${project.name}`}
              className={`project-filter-item ${value === project.id ? 'on' : ''}`}
              key={project.id}
              onClick={() => {
                onChange(project.id)
                setOpen(false)
              }}
              type="button"
            >
              <span className="project-filter-glyph" style={{ background: project.color }}>
                {project.glyph}
              </span>
              <b>{project.name}</b>
              <small>{project.activeIterationCode}</small>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
