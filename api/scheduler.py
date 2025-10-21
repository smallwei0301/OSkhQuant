"""APScheduler integration for Lazybacktest."""
from __future__ import annotations

import json
import logging
import os
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Dict, List

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from .celery_app import celery_app
from .schemas import ScheduleJobRequest, ScheduleJobResponse

LOGGER = logging.getLogger("lazybacktest.scheduler")


@dataclass
class _JobDefinition:
    job_id: str
    cron: str
    task_name: str
    args: List[Any]
    kwargs: Dict[str, Any]
    timezone: str


class TaskScheduler:
    """Manage scheduled Celery tasks via APScheduler."""

    def __init__(self) -> None:
        timezone = os.getenv("SCHEDULER_TIMEZONE", "Asia/Taipei")
        self.scheduler = AsyncIOScheduler(timezone=timezone)
        self._config_path = Path(os.getenv("SCHEDULE_CONFIG_PATH", "data/schedules.json"))
        self._jobs: Dict[str, _JobDefinition] = {}

    async def start(self) -> None:
        if not self.scheduler.running:
            self.scheduler.start()
            self._load_config()

    async def shutdown(self) -> None:
        if self.scheduler.running:
            self.scheduler.shutdown(wait=False)

    def _load_config(self) -> None:
        if not self._config_path.exists():
            return

        try:
            data = json.loads(self._config_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            LOGGER.exception("Invalid schedule configuration file: %s", self._config_path)
            return

        for item in data.get("jobs", []):
            try:
                request = ScheduleJobRequest(**item)
                self.add_or_update_job(request)
            except Exception:  # pylint: disable=broad-except
                LOGGER.exception("Failed to restore scheduled job from configuration")

    def _persist_config(self) -> None:
        if not self._config_path.parent.exists():
            self._config_path.parent.mkdir(parents=True, exist_ok=True)
        payload = {"jobs": [asdict(job) for job in self._jobs.values()]}
        self._config_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    def add_or_update_job(self, request: ScheduleJobRequest) -> ScheduleJobResponse:
        timezone = request.timezone or str(self.scheduler.timezone)
        trigger = CronTrigger.from_crontab(request.cron, timezone=timezone)

        if self.scheduler.get_job(request.job_id):
            self.scheduler.remove_job(request.job_id)

        self.scheduler.add_job(
            self._dispatch_task,
            trigger=trigger,
            id=request.job_id,
            args=[request.task_name, request.args, request.kwargs],
            replace_existing=True,
            misfire_grace_time=int(os.getenv("SCHEDULER_MISFIRE_GRACE", "60")),
        )

        self._jobs[request.job_id] = _JobDefinition(
            job_id=request.job_id,
            cron=request.cron,
            task_name=request.task_name,
            args=request.args,
            kwargs=request.kwargs,
            timezone=timezone,
        )
        self._persist_config()

        return self.get_job(request.job_id)

    def remove_job(self, job_id: str) -> None:
        if self.scheduler.get_job(job_id):
            self.scheduler.remove_job(job_id)
        if job_id in self._jobs:
            del self._jobs[job_id]
            self._persist_config()

    def list_jobs(self) -> List[ScheduleJobResponse]:
        responses: List[ScheduleJobResponse] = []
        for job in self.scheduler.get_jobs():
            info = self._jobs.get(job.id)
            cron = info.cron if info else ""
            responses.append(
                ScheduleJobResponse(
                    job_id=job.id,
                    next_run_time=job.next_run_time,
                    cron=cron,
                    task_name=info.task_name if info else "",
                )
            )
        return responses

    def get_job(self, job_id: str) -> ScheduleJobResponse:
        job = self.scheduler.get_job(job_id)
        if job is None:
            raise KeyError(job_id)
        info = self._jobs.get(job_id)
        return ScheduleJobResponse(
            job_id=job.id,
            next_run_time=job.next_run_time,
            cron=info.cron if info else "",
            task_name=info.task_name if info else "",
        )

    @staticmethod
    def _dispatch_task(task_name: str, args: List[Any], kwargs: Dict[str, Any]) -> None:
        LOGGER.info("Dispatch scheduled task %s", task_name)
        celery_app.send_task(task_name, args=args or [], kwargs=kwargs or {})


task_scheduler = TaskScheduler()

