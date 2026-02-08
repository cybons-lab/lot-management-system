from app.application.services.execution_queue_service import ExecutionQueueService
from app.infrastructure.persistence.models.execution_queue_model import ExecutionQueue


class TestExecutionQueueService:
    def test_enqueue_first_task_runs_immediately(self, db_session, normal_user):
        from app.infrastructure.persistence.models.base_model import Base

        print(f"DEBUG: Base.metadata.tables keys in test: {list(Base.metadata.tables.keys())}")

        service = ExecutionQueueService(db_session)
        result = service.enqueue(
            resource_type="test_res_1",
            resource_id="1",
            user_id=normal_user.id,
            parameters={"foo": "bar"},
        )
        assert result.status == "running"
        assert result.queue_entry.status == "running"
        assert result.position == 0

        # Check DB
        task = db_session.get(ExecutionQueue, result.queue_entry.id)
        assert task.status == "running"
        assert task.resource_type == "test_res_1"
        assert task.parameters["foo"] == "bar"

    def test_enqueue_second_task_is_pending(self, db_session, normal_user):
        service = ExecutionQueueService(db_session)
        # Task 1
        res1 = service.enqueue(
            resource_type="test_res_2", resource_id="1", user_id=normal_user.id, parameters={}
        )
        assert res1.status == "running"

        # Task 2
        res2 = service.enqueue(
            resource_type="test_res_2", resource_id="1", user_id=normal_user.id, parameters={}
        )
        assert res2.status == "pending"
        assert res2.position == 1
        assert res2.queue_entry.status == "pending"

        # Different user
        res3 = service.enqueue(
            resource_type="test_res_2", resource_id="1", user_id=normal_user.id, parameters={}
        )
        assert res3.status == "pending"
        assert res3.position == 2

    def test_complete_task_starts_next(self, db_session, normal_user):
        service = ExecutionQueueService(db_session)
        res1 = service.enqueue("test_res_3", "1", normal_user.id, {})
        res2 = service.enqueue("test_res_3", "1", normal_user.id, {})

        # Complete Task 1
        next_task = service.complete_task(res1.queue_entry.id, result_message="Done")

        # Check Task 1
        t1 = db_session.get(ExecutionQueue, res1.queue_entry.id)
        assert t1.status == "completed"
        assert t1.result_message == "Done"
        assert t1.completed_at is not None

        # Check Task 2 (Next)
        assert next_task is not None
        assert next_task.id == res2.queue_entry.id
        assert next_task.status == "running"
        assert next_task.started_at is not None

    def test_fail_task_starts_next(self, db_session, normal_user):
        service = ExecutionQueueService(db_session)
        res1 = service.enqueue("test_res_4", "1", normal_user.id, {})
        _res2 = service.enqueue("test_res_4", "1", normal_user.id, {})

        # Fail Task 1
        next_task = service.fail_task(res1.queue_entry.id, error_message="Error")

        # Check Task 1
        t1 = db_session.get(ExecutionQueue, res1.queue_entry.id)
        assert t1.status == "failed"
        assert t1.error_message == "Error"
        assert (
            t1.completed_at is not None
        )  # Failed is also completed in time sense? Or just set? The model has completed_at.

        # Check Task 2
        assert next_task is not None
        assert next_task.status == "running"

    def test_cancel_pending_task(self, db_session, normal_user):
        service = ExecutionQueueService(db_session)
        _res1 = service.enqueue("test_res_5", "1", normal_user.id, {})
        res2 = service.enqueue("test_res_5", "1", normal_user.id, {})

        # Cancel Task 2
        success = service.cancel_pending(res2.queue_entry.id, normal_user.id)
        assert success is True

        t2 = db_session.get(ExecutionQueue, res2.queue_entry.id)
        assert t2.status == "cancelled"

    def test_cancel_running_task_fails(self, db_session, normal_user):
        service = ExecutionQueueService(db_session)
        res1 = service.enqueue("test_res_6", "1", normal_user.id, {})

        success = service.cancel_pending(res1.queue_entry.id, normal_user.id)
        assert success is False  # Cannot cancel running task via cancel_pending (only pending)

        t1 = db_session.get(ExecutionQueue, res1.queue_entry.id)
        assert t1.status == "running"

    def test_get_status(self, db_session, normal_user):
        service = ExecutionQueueService(db_session)
        service.enqueue("test_res_7", "1", normal_user.id, {})
        service.enqueue("test_res_7", "1", normal_user.id, {})

        status = service.get_status("test_res_7", "1", normal_user.id)
        assert (
            status.queue_length == 1
        )  # 1 pending (running not counted in length usually? or all? Implementation check: filter(status='pending'))
        assert status.current_running_task is not None
        assert status.my_position == 1  # 1st in pending queue?
