export const SpinnerDots = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <style>{`
    .spinner_qM83 {
    animation: spinner_8HQG 1.05s infinite
}

.spinner_oXPr {
    animation-delay: .1s
}

.spinner_ZTLf {
    animation-delay: .2s
}

@keyframes spinner_8HQG {
    0 %, 57.14% {
        animation-timing-function: cubic-bezier(0.33, .66, .66, 1);
        transform: translate(0)
    }
    28.57% {
        animation-timing-function: cubic-bezier(0.33, 0, .66, .33);
        transform: translateY(-6px)
    }
    100% {
        transform: translate(0)
    }
}
    `}</style>
    <circle className="spinner_qM83" cx="4" cy="12" r="3" />
    <circle className="spinner_qM83 spinner_oXPr" cx="12" cy="12" r="3" />
    <circle className="spinner_qM83 spinner_ZTLf" cx="20" cy="12" r="3" />
  </svg>
);

export const SpinnerCircular = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <style>{`.spinner_ajPY {
    transform-origin: center;
    animation: spinner_AtaB .75s infinite linear
}

@keyframes spinner_AtaB {
    100% {
        transform: rotate(360deg)
    }
}`}</style>
    <path
      d="M12,1A11,11,0,1,0,23,12,11,11,0,0,0,12,1Zm0,19a8,8,0,1,1,8-8A8,8,0,0,1,12,20Z"
      opacity=".25"
    />
    <path
      d="M10.14,1.16a11,11,0,0,0-9,8.92A1.59,1.59,0,0,0,2.46,12,1.52,1.52,0,0,0,4.11,10.7a8,8,0,0,1,6.66-6.61A1.42,1.42,0,0,0,12,2.69h0A1.57,1.57,0,0,0,10.14,1.16Z"
      className="spinner_ajPY"
    />
  </svg>
);
