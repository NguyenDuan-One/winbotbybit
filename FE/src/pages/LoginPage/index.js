import RemoveRedEyeIcon from '@mui/icons-material/RemoveRedEye';
import styles from "./LoginPage.module.scss"
import logoImage from "../../assets/logo.png"
import { Button, FormControl, FormLabel, InputAdornment, TextField } from "@mui/material";
import { useForm } from "react-hook-form";
import { useDispatch } from "react-redux";
import { addMessageToast } from "../../store/slices/Toast";
import { login } from "../../services/authService";
import { useNavigate } from "react-router-dom";
import { Helmet } from 'react-helmet';
import { setUserDataLocal } from '../../store/slices/UserData';
import { styled } from '@mui/system';
function LoginPage() {

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors }
    } = useForm();

    const dispatch = useDispatch()

    const navigate = useNavigate()

    const handleLogin = async (data) => {
        data = {
            ...data,
            userName: data.userName?.trim(),
        }
        try {
            const res = await login(data);
            const { message, data: resData, status } = res.data
            dispatch(addMessageToast({
                status: status,
                message: message,
            }))
            reset({
                password: ""
            })
            if (status === 200) {
                reset()
                localStorage.setItem('tk_crypto', resData.token)
                dispatch(setUserDataLocal(resData.user))
                navigate("/")
            }
        } catch (error) {
            dispatch(addMessageToast({
                status: 500,
                message: error.message
            }));
        }
    }

    const CustomTextField = styled(TextField)({
        '& .MuiInputBase-input': {
            color: '#ecebeb', // Custom text color
        },
        '& .MuiOutlinedInput-root': {
            '& fieldset': {
                borderColor: '#ecebeb',
            },
            '&:hover fieldset': {
                borderColor: '#ecebeb',
            },
            '&.Mui-focused fieldset': {
                borderColor: '#ecebeb',
            },
            borderRadius: '8px',
        },
    });

    return (
        <div className={styles.loginPage} onKeyDown={e => {
            if (e.key === "Enter") {
                handleSubmit(handleLogin)()
            }
        }}>
            <Helmet title={`Login`} />

            <div className={styles.loginPageBody}>

                <form className={styles.form}>
                    <div className={styles.formWellCome}>
                        <div className={styles.headingLogo} >
                            <img src={logoImage} style={{ width: "100px" }} />
                            {/* <span className={styles.text}>WinBot</span> */}
                        </div>

                        <div className={styles.formTitle}>
                            <p className={styles.textMain}>WINBOT</p>
                            <p style={{ opacity: .9, textAlign: 'left' }}>Wellcome to WinBot</p>
                        </div>
                    </div>

                    <div className={styles.formData}>
                        <p className={styles.textHeaderWhite}>Đăng nhập</p>
                        <FormControl className={styles.formControl}>
                            <FormLabel className={styles.label}>Tài khoản</FormLabel>
                            <CustomTextField
                                error={errors.userName?.type === 'required'}
                                size="small"
                                {...register("userName", { required: true, minLength: 5 })}
                            />
                            {errors.userName?.type === 'required' && (<p className="formControlErrorLabel">Hãy nhập tên tài khoản.</p>)}
                            {errors.userName?.type === 'minLength' && (<p className="formControlErrorLabel">Tối thiểu 5 kí tự.</p>)}

                        </FormControl>

                        <FormControl className={styles.formControl}>
                            <FormLabel className={styles.label}>Mật khẩu</FormLabel>
                            <CustomTextField
                                error={errors.password?.type === 'required'}
                                type="password"
                                size="small"
                                {...register("password", { required: true, minLength: 5 })}
                                InputProps={{
                                    endAdornment:
                                        <InputAdornment
                                            position="end"
                                            style={{
                                                cursor: "pointer"
                                            }}
                                            onClick={e => {
                                                const typeCurrent = e.currentTarget.parentElement.querySelector("input")
                                                typeCurrent.type === "password" ? (typeCurrent.type = "text") : (typeCurrent.type = "password")
                                            }}
                                        >
                                            <RemoveRedEyeIcon />
                                        </InputAdornment>
                                }}
                            />
                            {errors.password?.type === 'required' && (<p className="formControlErrorLabel">Hãy nhập mật khẩu.</p>)}
                            {errors.password?.type === 'minLength' && (<p className="formControlErrorLabel">Độ dài kí tự lớn hơn 5.</p>)}

                        </FormControl>
                        <Button
                            onClick={handleSubmit(handleLogin)}
                            variant="contained"
                            style={{ marginTop: "16px",background:"rgb(26, 28, 29)" }}>
                            Đăng nhập
                        </Button>
                    </div>

                </form>


            </div>
        </div>
    );
}

export default LoginPage;