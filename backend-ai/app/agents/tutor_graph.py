from langgraph.graph import StateGraph, START, END
from app.agents.tutor_state import TutorState
from app.agents.nodes import (
    validate_input_node,
    analyze_progress_node,
    select_strategy_node,
    generate_hint_node,
    validate_response_node,
    finalize_response_node,
)


def should_continue_after_validation(state: TutorState) -> str:
    """Branches after input validation: abort immediately if input is invalid."""
    if not state.get("input_valid", True):
        return "finalize_response"
    return "analyze_progress"


def should_retry_hint_generation(state: TutorState) -> str:
    """Branches after response validation: retry once if validation failed, else finalize."""
    if state.get("validated", False):
        return "finalize_response"

    # Allow at most 1 retry (validation_attempts == 1)
    if state.get("validation_attempts", 0) < 2:
        return "generate_hint"

    return "finalize_response"


def build_tutor_graph():
    """Builds and compiles the 6-node LangGraph adaptive tutor state graph."""
    builder = StateGraph(TutorState)

    # Add Nodes
    builder.add_node("validate_input", validate_input_node)
    builder.add_node("analyze_progress", analyze_progress_node)
    builder.add_node("select_strategy", select_strategy_node)
    builder.add_node("generate_hint", generate_hint_node)
    builder.add_node("validate_response", validate_response_node)
    builder.add_node("finalize_response", finalize_response_node)

    # Add Edges
    builder.add_edge(START, "validate_input")

    builder.add_conditional_edges(
        "validate_input",
        should_continue_after_validation,
        {
            "analyze_progress": "analyze_progress",
            "finalize_response": "finalize_response",
        },
    )

    builder.add_edge("analyze_progress", "select_strategy")
    builder.add_edge("select_strategy", "generate_hint")
    builder.add_edge("generate_hint", "validate_response")

    builder.add_conditional_edges(
        "validate_response",
        should_retry_hint_generation,
        {
            "generate_hint": "generate_hint",
            "finalize_response": "finalize_response",
        },
    )

    builder.add_edge("finalize_response", END)

    return builder.compile()


# Compiled singleton graph
tutor_graph = build_tutor_graph()
