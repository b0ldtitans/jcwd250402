import { useSelector, useDispatch } from "react-redux";
import { loginModalSlice } from "./modalSlice";

const useLoginModal = () => {
  const state = useSelector((state) => state.loginModal);
  const dispatch = useDispatch();

  console.log("LoginModal state:", state);

  return {
    isOpen: state.isOpen,
    onOpen: () => dispatch(loginModalSlice.actions.openLoginModal()),
    onClose: () => dispatch(loginModalSlice.actions.closeLoginModal()),
  };
};

export default useLoginModal;
