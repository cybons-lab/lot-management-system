from collections.abc import Callable
from contextlib import AbstractContextManager

from sqlalchemy.orm import Session


class UnitOfWork(AbstractContextManager):
    def __init__(self, session_factory: Callable[[], Session]):
        self._session_factory = session_factory
        self.session: Session | None = None

    def __enter__(self):
        self.session = self._session_factory()
        self.session.begin()  # 明示開始
        return self

    def __exit__(self, exc_type, exc, tb):
        try:
            if exc_type is None:
                self.session.commit()
            else:
                self.session.rollback()
        finally:
            self.session.close()
