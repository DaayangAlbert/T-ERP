from flask import request


def get_pagination_params(default_page=1, default_page_size=20, max_page_size=100):
    try:
        page = int(request.args.get("page", default_page))
    except (TypeError, ValueError):
        page = default_page

    try:
        page_size = int(request.args.get("page_size", default_page_size))
    except (TypeError, ValueError):
        page_size = default_page_size

    if page < 1:
        page = 1

    if page_size < 1:
        page_size = default_page_size

    page_size = min(page_size, max_page_size)

    return page, page_size


def paginate_query(query, page, page_size, serializer):
    pagination = query.paginate(page=page, per_page=page_size, error_out=False)

    return {
        "items": [serializer(row) for row in pagination.items],
        "pagination": {
            "page": pagination.page,
            "page_size": pagination.per_page,
            "total": pagination.total,
            "total_pages": pagination.pages,
        },
    }


def paginate_items(items, page, page_size):
    total = len(items)
    start = (page - 1) * page_size
    end = start + page_size
    sliced = items[start:end]

    return {
        "items": sliced,
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": (total + page_size - 1) // page_size,
        },
    }
